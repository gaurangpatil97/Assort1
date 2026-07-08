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

    const formData = await request.formData();
    const note = formData.get('note') as string | undefined;

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 files allowed' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 10MB limit` }, { status: 400 });
      }
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
      }
    }

    // Upload files to Supabase
    const { uploadFile } = await import('@/lib/supabase');
    const uploadedAttachments: { fileName: string; fileType: string; fileSize: number; storageKey: string }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `${companyId}/tasks/${taskId}/milestones/${milestoneId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const { path, error } = await uploadFile(buffer, uniqueName, file.type);
      if (error || !path) {
        return NextResponse.json({ error: `Failed to upload file ${file.name}` }, { status: 500 });
      }
      uploadedAttachments.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageKey: path,
      });
    }

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

      const submission = await tx.milestoneSubmission.create({
        data: {
          milestoneId,
          submittedById: userId,
          note: note || null,
        },
      });

      if (uploadedAttachments.length > 0) {
        await tx.milestoneAttachment.createMany({
          data: uploadedAttachments.map(att => ({
            submissionId: submission.id,
            uploadedById: userId,
            fileName: att.fileName,
            mimeType: att.fileType,
            fileSize: att.fileSize,
            storageKey: att.storageKey,
          })),
        });
      }

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
