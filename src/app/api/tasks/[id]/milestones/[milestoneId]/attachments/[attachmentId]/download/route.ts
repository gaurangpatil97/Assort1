import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { generateSignedUrl } from '@/lib/supabase';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string; milestoneId: string; attachmentId: string }> }
) {
  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const { id: userId, companyId, baseLevel, departmentId } = userOrResponse;

  const params = await props.params;
  const { id: taskId, milestoneId, attachmentId } = params;

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

    const attachment = await prisma.milestoneAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        submission: true,
      },
    });

    if (!attachment || attachment.submission.milestoneId !== milestoneId) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const signedUrl = await generateSignedUrl(attachment.storageKey, 60);

    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: signedUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    });
  } catch (error) {
    console.error('Milestone attachment download GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
