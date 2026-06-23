import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { EntityType } from '@prisma/client';

export async function GET(request: Request) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { companyId, baseLevel } = userOrResponse;

  // Admin only
  if (baseLevel !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const userIdFilter = url.searchParams.get('userId');
  const actionFilter = url.searchParams.get('action');
  const entityTypeFilter = url.searchParams.get('entityType') as EntityType | null;
  const fromFilter = url.searchParams.get('from');
  const toFilter = url.searchParams.get('to');
  
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  try {
    const filter: any = { companyId };

    if (userIdFilter) filter.userId = userIdFilter;
    if (actionFilter) filter.action = actionFilter;
    if (entityTypeFilter) filter.entityType = entityTypeFilter;

    if (fromFilter || toFilter) {
      filter.createdAt = {};
      if (fromFilter) filter.createdAt.gte = new Date(fromFilter);
      if (toFilter) filter.createdAt.lte = new Date(toFilter);
    }

    const logs = await prisma.auditLog.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
