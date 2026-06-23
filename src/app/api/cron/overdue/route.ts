import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { TaskState, EntityType } from '@prisma/client';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('x-cron-secret');
  if (authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const overdueTasks = await prisma.task.findMany({
      where: {
        state: TaskState.ACTIVE,
        dueDate: { lt: now },
      },
      select: {
        id: true,
        companyId: true,
        title: true,
        assigneeId: true,
        createdById: true,
      },
    });

    if (overdueTasks.length === 0) {
      return NextResponse.json({ updated: 0, taskIds: [] });
    }

    const taskIds = overdueTasks.map((t) => t.id);

    // Update in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Batch update tasks
      await tx.task.updateMany({
        where: { id: { in: taskIds } },
        data: { state: TaskState.OVERDUE },
      });

      // 2. Audit logs
      await tx.auditLog.createMany({
        data: overdueTasks.map((task) => ({
          companyId: task.companyId,
          action: 'task.overdue',
          entityType: EntityType.TASK,
          entityId: task.id,
        })),
      });
    });

    // 3. Notifications (createNotification helper internally handles its own try/catch to not throw)
    for (const task of overdueTasks) {
      const notifyIds = new Set<string>();
      if (task.assigneeId) notifyIds.add(task.assigneeId);
      if (task.createdById) notifyIds.add(task.createdById);

      for (const targetUserId of notifyIds) {
        await createNotification({
          companyId: task.companyId,
          userId: targetUserId,
          type: 'task.overdue',
          title: 'Task Overdue',
          body: `Task "${task.title}" is now overdue.`,
          entityType: EntityType.TASK,
          entityId: task.id,
          // Not sending emails by default unless required, spec doesn't say "sendEmail: true" for overdue explicitly but helper handles it if needed
        });
      }
    }

    return NextResponse.json({ updated: overdueTasks.length, taskIds });
  } catch (error) {
    console.error('Cron overdue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
