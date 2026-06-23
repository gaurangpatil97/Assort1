import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../../helper';
import { z } from 'zod';
import { CompanyStatus, EntityType } from '@prisma/client';

const statusSchema = z.object({
  status: z.nativeEnum(CompanyStatus),
});

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { userId } = adminCheck;

  const params = await props.params;
  const { id } = params;

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { status } = parsed.data;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.status === status) {
      return NextResponse.json({ success: true }); // No change
    }

    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'company.status_changed',
          entityType: EntityType.COMPANY,
          entityId: id,
          metadata: {
            from: company.status,
            to: status,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
