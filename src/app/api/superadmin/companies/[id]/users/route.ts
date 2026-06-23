import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../../../helper';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const params = await props.params;
  const { id } = params;

  try {
    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: {
        id: true,
        name: true,
        email: true,
        baseLevel: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
