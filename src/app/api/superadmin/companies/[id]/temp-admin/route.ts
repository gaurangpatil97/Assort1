import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../../helper';
import { z } from 'zod';
import { BaseLevel, EntityType, UserStatus } from '@prisma/client';

const tempAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { userId } = adminCheck;

  const params = await props.params;
  const { id } = params;

  try {
    const body = await request.json();
    const parsed = tempAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { name, email } = parsed.data;

    // Check if company exists
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Find the admin role
    const adminRole = await prisma.role.findFirst({
      where: { companyId: id, name: 'admin' },
    });

    if (!adminRole) {
      return NextResponse.json({ error: 'Admin role not found for company' }, { status: 500 });
    }

    const tempAdmin = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: id,
          roleId: adminRole.id,
          name,
          email,
          baseLevel: BaseLevel.ADMIN,
          designation: 'TEMP_ADMIN',
          status: UserStatus.ACTIVE,
          emailVerified: true, // Auto-verified since it's superadmin created
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'temp_admin.created',
          entityType: EntityType.USER,
          entityId: user.id,
        },
      });

      return user;
    });

    return NextResponse.json(tempAdmin, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
