import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { requireSameCompany } from '@/lib/tenant';
import { EntityType, MilestoneStatus } from '@prisma/client';
import { z } from 'zod';

const resubmitSchema = z.object({
  note: z.string().optional(),
});

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const { id: userId, companyId } = userOrResponse;

  const params = await props.params;
  const { id } = params;

  try {
    const body = await request.json();
    const parsed = resubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        task: true,
        submissions: { select: { attemptNumber: true } },
      },
    });

    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    await requireSameCompany(userId, milestone.task.companyId);

    if (milestone.task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden. Only the assignee can resubmit the milestone.' }, { status: 403 });
    }

    if (milestone.status !== MilestoneStatus.REJECTED) {
      return NextResponse.json({ error: 'Milestone is not in REJECTED status' }, { status: 400 });
    }

    let maxAttempt = 0;
    if (milestone.submissions.length > 0) {
      maxAttempt = Math.max(...milestone.submissions.map((s) => s.attemptNumber));
    }
    const attemptNumber = maxAttempt + 1;

    await prisma.$transaction(async (tx) => {
      const submission = await tx.milestoneSubmission.create({
        data: {
          milestoneId: id,
          submittedById: userId,
          attemptNumber,
          note: parsed.data.note,
        },
      });

      await tx.milestone.update({
        where: { id },
        data: {
          status: MilestoneStatus.SUBMITTED,
          resubmittedAt: new Date(),
        },
      });

      // Notify task creator and manager
      const notifications = [];
      if (milestone.task.createdById) {
        notifications.push({
          companyId,
          userId: milestone.task.createdById,
          type: 'milestone.resubmitted',
          title: 'Milestone Resubmitted',
          body: `Milestone "${milestone.name}" has been resubmitted for task "${milestone.task.title}".`,
          entityType: EntityType.MILESTONE,
          entityId: milestone.id,
        });
      }

      const assigneeUser = await tx.user.findUnique({ where: { id: userId } });
      if (assigneeUser?.managerId && assigneeUser.managerId !== milestone.task.createdById) {
        notifications.push({
          companyId,
          userId: assigneeUser.managerId,
          type: 'milestone.resubmitted',
          title: 'Milestone Resubmitted',
          body: `Milestone "${milestone.name}" has been resubmitted for task "${milestone.task.title}".`,
          entityType: EntityType.MILESTONE,
          entityId: milestone.id,
        });
      }

      if (notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'milestone.resubmitted',
          entityType: EntityType.MILESTONE,
          entityId: milestone.id,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
