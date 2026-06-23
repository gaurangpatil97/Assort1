import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { EntityType } from '@prisma/client';

export async function createNotification(params: {
  companyId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: EntityType;
  entityId?: string;
  sendEmail?: boolean;
  userEmail?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    if (params.sendEmail && params.userEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.example.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || 'dummy',
            pass: process.env.SMTP_PASS || 'dummy',
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'notifications@assort1.com',
          to: params.userEmail,
          subject: params.title,
          text: params.body,
        });

        await prisma.notification.update({
          where: { id: notification.id },
          data: { emailSentAt: new Date() },
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Do not throw so we don't break the main flow
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification row:', error);
    // Silent fail per requirement: "Notification creation must never throw and break the main request flow"
    return null;
  }
}
