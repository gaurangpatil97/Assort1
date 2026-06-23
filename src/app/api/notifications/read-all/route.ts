import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';

export async function PATCH(request: Request) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId } = userOrResponse;

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        companyId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('PATCH read-all notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
