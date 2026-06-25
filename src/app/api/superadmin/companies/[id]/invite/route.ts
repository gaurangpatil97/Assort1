import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isSuperadmin } from '../../../helper'
import { z } from 'zod'
import { EntityType, InviteStatus } from '@prisma/client'
import nodemailer from 'nodemailer'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

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
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { name, email } = parsed.data

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    const adminRole = await prisma.role.findFirst({
      where: { companyId, baseLevel: 'ADMIN' }
    })
    if (!adminRole) return NextResponse.json({ error: 'Admin role not found' }, { status: 500 })

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.create({
        data: {
          companyId,
          roleId: adminRole.id,
          email,
          name,
          status: InviteStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: 'invite.created',
          entityType: EntityType.INVITE,
          entityId: invite.id,
        }
      })
      return invite
    })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: { user: process.env.SMTP_USER || 'user', pass: process.env.SMTP_PASS || 'pass' },
    })
    try {
      await transporter.sendMail({
        from: '"Assort1" <noreply@assort1.com>',
        to: result.email,
        subject: 'You have been invited to Assort1',
        text: `Hello ${result.name}, you have been invited to join ${company.name} on Assort1. Use this token to register: ${result.token}`,
      })
    } catch (e) {
      console.error('Failed to send email', e)
    }

    return NextResponse.json({ success: true, inviteId: result.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
