import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { requirePermission } from '@/lib/rbac';
import { requireSameCompany } from '@/lib/tenant';
import { z } from 'zod';
import { EntityType, BaseLevel } from '@prisma/client';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const taskId = params.id;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId, baseLevel, departmentId } = userOrResponse;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, companyId },
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (baseLevel === 'MANAGER' && task.departmentId !== departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ((baseLevel === 'MEMBER' || baseLevel === 'VIEWER') && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Task comments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const taskId = params.id;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const permCheck = await requirePermission(request, 'comment_task');
  if (permCheck) return permCheck;

  const { id: userId, companyId, baseLevel, departmentId } = userOrResponse;

  try {
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const { content } = parsed.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId, companyId },
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (baseLevel === 'MANAGER' && task.departmentId !== departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ((baseLevel === 'MEMBER' || baseLevel === 'VIEWER') && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.taskComment.create({
        data: {
          taskId,
          userId,
          content,
        },
      });

      const notifyIds = new Set<string>();
      if (task.assigneeId && task.assigneeId !== userId) notifyIds.add(task.assigneeId);
      if (task.createdById !== userId) notifyIds.add(task.createdById);

      for (const targetUserId of notifyIds) {
        await tx.notification.create({
          data: {
            companyId,
            userId: targetUserId,
            type: 'task.commented',
            title: 'New Comment on Task',
            body: `A new comment was added to task: "${task.title}"`,
            entityType: EntityType.TASK,
            entityId: task.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'comment.created',
          entityType: EntityType.TASK_COMMENT,
          entityId: newComment.id,
        },
      });

      return newComment;
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Task comments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
