import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../../helper';
import { EntityType, UserStatus } from '@prisma/client';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { userId } = adminCheck;

  const params = await props.params;
  const { id } = params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status === UserStatus.DEACTIVATED) {
      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status: UserStatus.DEACTIVATED },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'user.deactivated',
          entityType: EntityType.USER,
          entityId: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
