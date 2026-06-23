import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuperadmin } from '../helper';
import { z } from 'zod';
import { DemoRequestStatus } from '@prisma/client';

export async function GET(request: Request) {
  const adminCheck = await isSuperadmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');

  try {
    const demoRequests = await prisma.demoRequest.findMany({
      where: statusParam ? { status: statusParam as DemoRequestStatus } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(demoRequests);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createDemoRequestSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createDemoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const demoRequest = await prisma.demoRequest.create({
      data: {
        ...parsed.data,
        status: DemoRequestStatus.PENDING,
      },
    });

    return NextResponse.json(demoRequest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
