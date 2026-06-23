import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { requireSameCompany } from '@/lib/tenant';
import { EntityType, MilestoneStatus } from '@prisma/client';
import { z } from 'zod';

const submitSchema = z.object({
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
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        task: true,
        submissions: { select: { id: true } },
      },
    });

    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    await requireSameCompany(userId, milestone.task.companyId);

    if (milestone.task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden. Only the assignee can submit the milestone.' }, { status: 403 });
    }

    if (milestone.status !== MilestoneStatus.NOT_STARTED && milestone.status !== MilestoneStatus.REJECTED) {
      return NextResponse.json({ error: 'Milestone is not in a submittable status' }, { status: 400 });
    }

    const isFirstSubmission = milestone.submissions.length === 0;
    const attemptNumber = milestone.submissions.length + 1;

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
          ...(isFirstSubmission
            ? { submittedAt: milestone.submittedAt ?? new Date() }
            : { resubmittedAt: new Date() }),
        },
      });

      // Notify task creator and manager
      const notifications = [];
      if (milestone.task.createdById) {
        notifications.push({
          companyId,
          userId: milestone.task.createdById,
          type: 'milestone.submitted',
          title: 'Milestone Submitted',
          body: `Milestone "${milestone.name}" has been submitted for task "${milestone.task.title}".`,
          entityType: EntityType.MILESTONE,
          entityId: milestone.id,
        });
      }

      // We should also notify the manager, if the assignee has one.
      const assigneeUser = await tx.user.findUnique({ where: { id: userId } });
      if (assigneeUser?.managerId && assigneeUser.managerId !== milestone.task.createdById) {
        notifications.push({
          companyId,
          userId: assigneeUser.managerId,
          type: 'milestone.submitted',
          title: 'Milestone Submitted',
          body: `Milestone "${milestone.name}" has been submitted for task "${milestone.task.title}".`,
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
          action: 'milestone.submitted',
          entityType: EntityType.MILESTONE,
          entityId: milestone.id,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
