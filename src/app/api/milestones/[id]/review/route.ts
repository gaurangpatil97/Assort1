import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { requireSameCompany } from '@/lib/tenant';
import { EntityType, MilestoneStatus, TaskState } from '@prisma/client';
import { z } from 'zod';

const reviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().optional(),
  newDeadline: z.string().optional(),
}).refine((data) => {
  if (data.decision === 'REJECT') {
    return !!data.note && !!data.newDeadline;
  }
  return true;
}, { message: 'note and newDeadline are required on REJECT', path: ['decision'] })
.refine((data) => {
  if (data.decision === 'REJECT' && data.newDeadline) {
    return new Date(data.newDeadline).getTime() > Date.now();
  }
  return true;
}, { message: 'newDeadline cannot be in the past', path: ['newDeadline'] });

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const { id: userId, companyId, baseLevel } = userOrResponse;

  if (baseLevel === 'MEMBER' || baseLevel === 'VIEWER') {
    return NextResponse.json({ error: 'Forbidden. Only MANAGER or ADMIN can review milestones.' }, { status: 403 });
  }

  const params = await props.params;
  const { id } = params;

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });

    const { decision, note, newDeadline } = parsed.data;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        task: {
          include: { milestones: true },
        },
        submissions: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    await requireSameCompany(userId, milestone.task.companyId);

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Milestone is not in SUBMITTED status' }, { status: 400 });
    }

    const latestSubmission = milestone.submissions[0];
    if (!latestSubmission) {
      return NextResponse.json({ error: 'No submission found for this milestone' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (decision === 'APPROVE') {
        await tx.milestoneSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            reviewedById: userId,
            reviewedAt: now,
            reviewNote: note,
          },
        });

        await tx.milestone.update({
          where: { id },
          data: {
            status: MilestoneStatus.APPROVED,
            approvedAt: now,
            reviewedById: userId,
          },
        });

        const allApproved = milestone.task.milestones.every(
          (m) => (m.id === id ? true : m.status === MilestoneStatus.APPROVED)
        );

        if (allApproved) {
          await tx.task.update({
            where: { id: milestone.taskId },
            data: { state: TaskState.COMPLETED },
          });
        }

        if (milestone.task.assigneeId) {
          await tx.notification.create({
            data: {
              companyId,
              userId: milestone.task.assigneeId,
              type: 'milestone.approved',
              title: 'Milestone Approved',
              body: `Your milestone "${milestone.name}" on task "${milestone.task.title}" was approved.`,
              entityType: EntityType.MILESTONE,
              entityId: id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId,
            companyId,
            action: 'milestone.approved',
            entityType: EntityType.MILESTONE,
            entityId: id,
          },
        });
      } else {
        await tx.milestoneSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            reviewedById: userId,
            reviewedAt: now,
            reviewNote: note,
            newDeadline: new Date(newDeadline!),
          },
        });

        await tx.milestone.update({
          where: { id },
          data: {
            status: MilestoneStatus.REJECTED,
            rejectedAt: now,
            newDeadline: new Date(newDeadline!),
            reviewedById: userId,
            rejectionNote: note,
          },
        });

        if (milestone.task.assigneeId) {
          await tx.notification.create({
            data: {
              companyId,
              userId: milestone.task.assigneeId,
              type: 'milestone.rejected',
              title: 'Milestone Rejected',
              body: `Your milestone "${milestone.name}" on task "${milestone.task.title}" was rejected. Check the review note.`,
              entityType: EntityType.MILESTONE,
              entityId: id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId,
            companyId,
            action: 'milestone.rejected',
            entityType: EntityType.MILESTONE,
            entityId: id,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
