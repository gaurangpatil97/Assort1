import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isSuperadmin } from '../../../../helper'
import { EntityType, UserStatus } from '@prisma/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const adminCheck = await isSuperadmin(request)
  if (adminCheck instanceof NextResponse) return adminCheck
  const { userId: superadminId } = adminCheck
  const { id: companyId, userId } = await params

  try {
    const body = await request.json()
    const newStatus = body.status as UserStatus

    if (!['ACTIVE', 'DEACTIVATED'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.companyId !== companyId || user.designation !== 'TEMP_ADMIN') {
      return NextResponse.json({ error: 'Temp admin not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { status: newStatus }
      })
      await tx.auditLog.create({
        data: {
          userId: superadminId,
          action: newStatus === 'DEACTIVATED' ? 'temp_admin.deactivated' : 'temp_admin.reactivated',
          entityType: EntityType.USER,
          entityId: userId,
        }
      })
      return u
    })

    return NextResponse.json({ success: true, status: updated.status })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
