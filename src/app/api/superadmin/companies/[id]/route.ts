import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../helper';
import { CompanyStatus, EntityType } from '@prisma/client';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        users: {
          where: { baseLevel: 'ADMIN' },
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: company.id,
      name: company.name,
      status: company.status,
      createdAt: company.createdAt,
      timezone: company.timezone,
      employeeCount: company._count.users,
      admins: company.users
    });
  } catch (error) {
    console.error('Failed to get company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateStatusSchema = z.object({
  status: z.enum([CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED, CompanyStatus.ARCHIVED]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { status } = result.data;

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const updatedCompany = await prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id },
        data: { status }
      });

      await tx.auditLog.create({
        data: {
          action: 'company.status_changed',
          entityType: EntityType.COMPANY,
          entityId: id,
          userId: adminCheck.userId,
          metadata: { oldStatus: existingCompany.status, newStatus: status }
        }
      });

      return company;
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Failed to update company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
