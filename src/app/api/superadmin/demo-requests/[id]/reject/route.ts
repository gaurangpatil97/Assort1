import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../../helper';
import { DemoRequestStatus, EntityType } from '@prisma/client';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { userId } = adminCheck;

  const params = await props.params;
  const { id } = params;

  try {
    const demoRequest = await prisma.demoRequest.findUnique({ where: { id } });
    if (!demoRequest || demoRequest.status !== DemoRequestStatus.PENDING) {
      return NextResponse.json({ error: 'Invalid demo request' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.demoRequest.update({
        where: { id },
        data: { status: DemoRequestStatus.REJECTED },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'demo_request.rejected',
          entityType: EntityType.DEMO_REQUEST,
          entityId: id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
