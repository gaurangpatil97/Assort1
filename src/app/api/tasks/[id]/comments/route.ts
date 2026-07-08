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

    const isParticipant = task.assigneeId === userId || task.createdById === userId;
    if (!isParticipant) {
      if (baseLevel === 'MANAGER' && task.departmentId !== departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (baseLevel === 'MEMBER' || baseLevel === 'VIEWER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        attachments: true,
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
    const formData = await request.formData();
    const content = formData.get('content') as string;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

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

    const task = await prisma.task.findUnique({
      where: { id: taskId, companyId },
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const isParticipant = task.assigneeId === userId || task.createdById === userId;
    if (!isParticipant) {
      if (baseLevel === 'MANAGER' && task.departmentId !== departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (baseLevel === 'MEMBER' || baseLevel === 'VIEWER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Upload files to Supabase
    const { uploadFile } = await import('@/lib/supabase');
    const uploadedAttachments: { fileName: string; fileType: string; fileSize: number; storageKey: string }[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueName = `${companyId}/tasks/${taskId}/comments/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
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

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.taskComment.create({
        data: {
          taskId,
          userId,
          content,
        },
      });

      if (uploadedAttachments.length > 0) {
        await tx.taskAttachment.createMany({
          data: uploadedAttachments.map(att => ({
            taskId,
            commentId: newComment.id,
            uploadedById: userId,
            fileName: att.fileName,
            mimeType: att.fileType,
            fileSize: att.fileSize,
            storageKey: att.storageKey,
          })),
        });
      }

      const notifyIds = new Set<string>();
      if (task.assigneeId && task.assigneeId !== userId) notifyIds.add(task.assigneeId);
      if (task.createdById !== userId) notifyIds.add(task.createdById);

      for (const targetUserId of notifyIds) {
        await tx.notification.create({
          data: {
            companyId,
            userId: targetUserId,
            type: 'task.commented',
            title: 'New Comment',
            body: `New comment on task "${task.title}"`,
            entityType: EntityType.TASK,
            entityId: taskId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'task.commented',
          entityType: EntityType.TASK,
          entityId: taskId,
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
