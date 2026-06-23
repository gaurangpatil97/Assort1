import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';

export async function GET(request: Request) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId } = userOrResponse;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

  try {
    const filter: any = {
      userId,
      companyId,
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        entityType: true,
        entityId: true,
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
