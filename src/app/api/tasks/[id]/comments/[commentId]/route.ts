import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { z } from 'zod';
import { EntityType } from '@prisma/client';

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function PATCH(request: Request, props: { params: Promise<{ id: string; commentId: string }> }) {
  const params = await props.params;
  const taskId = params.id;
  const commentId = params.commentId;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId, baseLevel } = userOrResponse;

  try {
    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const { content } = parsed.data;

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment || comment.task.companyId !== companyId || comment.taskId !== taskId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.userId !== userId && baseLevel !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedComment = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskComment.update({
        where: { id: commentId },
        data: { content },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'comment.updated',
          entityType: EntityType.TASK_COMMENT,
          entityId: updated.id,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Task comments PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string; commentId: string }> }) {
  const params = await props.params;
  const taskId = params.id;
  const commentId = params.commentId;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId, baseLevel } = userOrResponse;

  try {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment || comment.task.companyId !== companyId || comment.taskId !== taskId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.userId !== userId && baseLevel !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskComment.delete({
        where: { id: commentId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'comment.deleted',
          entityType: EntityType.TASK_COMMENT,
          entityId: commentId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task comments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
