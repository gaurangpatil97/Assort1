import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '../../../../../helper';
import { EntityType, MilestoneStatus } from '@prisma/client';
import { z } from 'zod';

const submitSchema = z.object({
  note: z.string().optional(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const { id: userId, companyId } = userOrResponse;

  const params = await props.params;
  const { id: taskId, milestoneId } = params;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { milestones: { where: { id: milestoneId } } },
    });

    if (!task || task.milestones.length === 0) {
      return NextResponse.json({ error: 'Task or Milestone not found' }, { status: 404 });
    }

    if (task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Only the task assignee can submit milestones' }, { status: 403 });
    }

    const milestone = task.milestones[0];

    if (milestone.status !== MilestoneStatus.NOT_STARTED && milestone.status !== MilestoneStatus.REJECTED) {
      return NextResponse.json({ error: 'Milestone cannot be submitted in its current state' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = submitSchema.safeParse(body);
    const note = parsed.success ? parsed.data.note : undefined;

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.SUBMITTED,
          submittedAt: milestone.submittedAt || now,
          resubmittedAt: milestone.submittedAt ? now : undefined,
        },
      });

      await tx.milestoneSubmission.create({
        data: {
          milestoneId,
          submittedById: userId,
          note: note || null,
        },
      });

      if (task.createdById !== userId) {
        await tx.notification.create({
          data: {
            companyId,
            userId: task.createdById,
            type: 'milestone.submitted',
            title: 'Milestone Submitted',
            body: `Milestone "${milestone.name}" has been submitted for review.`,
            entityType: EntityType.MILESTONE,
            entityId: milestoneId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'milestone.submitted',
          entityType: EntityType.MILESTONE,
          entityId: milestoneId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Milestone submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
