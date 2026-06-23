import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../helper';
import { z } from 'zod';
import { seedNewCompany } from '@/lib/company-seed';
import nodemailer from 'nodemailer';
import { CompanyStatus, EntityType, InviteStatus } from '@prisma/client';

export async function GET(request: Request) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          where: { baseLevel: 'ADMIN' },
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = companies.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt,
      employeeCount: c._count.users,
      admins: c.users,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createCompanySchema = z.object({
  name: z.string().min(1),
  timezone: z.string().optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
});

export async function POST(request: Request) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { userId } = adminCheck;

  try {
    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { name, timezone, adminName, adminEmail } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name,
          timezone,
          status: CompanyStatus.PENDING_SETUP,
        },
      });

      // 2. Seed company
      await seedNewCompany(tx, company.id);

      // 3. Find admin role
      const adminRole = await tx.role.findFirst({
        where: { companyId: company.id, name: 'admin' },
      });

      if (!adminRole) {
        throw new Error('Admin role not generated');
      }

      // 4. Create invite and audit log in transaction
      const newInvite = await tx.invite.create({
        data: {
          companyId: company.id,
          roleId: adminRole.id,
          email: adminEmail,
          name: adminName,
          status: InviteStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'company.created',
          entityType: EntityType.COMPANY,
          entityId: company.id,
        },
      });

      return { company, invite: newInvite };
    });
    
    const { company, invite } = result;

    // 5. Send Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
      },
    });

    try {
      await transporter.sendMail({
        from: '"Assort1" <noreply@assort1.com>',
        to: invite.email,
        subject: 'Welcome to Assort1 - You are invited!',
        text: `Hello ${invite.name}, your company ${company.name} has been created. Use this token to join: ${invite.token}`,
      });
    } catch (e) {
      console.error('Failed to send email', e);
    }

    return NextResponse.json({ success: true, companyId: company.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
