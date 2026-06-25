import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isSuperadmin } from '../../../helper'
import { z } from 'zod'
import { EntityType, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isSuperadmin(request)
  if (adminCheck instanceof NextResponse) return adminCheck
  const { id: companyId } = await params

  try {
    const tempAdmins = await prisma.user.findMany({
      where: { companyId, designation: 'TEMP_ADMIN' },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(tempAdmins)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isSuperadmin(request)
  if (adminCheck instanceof NextResponse) return adminCheck
  const { userId } = adminCheck
  const { id: companyId } = await params

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { name, email } = parsed.data

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const adminRole = await prisma.role.findFirst({
      where: { companyId, baseLevel: 'ADMIN' }
    })
    if (!adminRole) return NextResponse.json({ error: 'Admin role not found' }, { status: 500 })

    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId,
          roleId: adminRole.id,
          name,
          email,
          passwordHash: hashedPassword,
          baseLevel: 'ADMIN',
          designation: 'TEMP_ADMIN',
          status: UserStatus.ACTIVE,
        }
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: 'temp_admin.created',
          entityType: EntityType.USER,
          entityId: user.id,
        }
      })
      return user
    })

    return NextResponse.json({
      success: true,
      userId: result.id,
      email: result.email,
      tempPassword,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
