import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, props: { params: Promise<{ id: string; attachmentId: string }> }) {
  const params = await props.params;
  const taskId = params.id;
  const attachmentId = params.attachmentId;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId, baseLevel, departmentId } = userOrResponse;

  try {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true },
    });

    if (!attachment || attachment.task.companyId !== companyId || attachment.taskId !== taskId) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify visibility
    const task = attachment.task;
    if (baseLevel === 'MANAGER' && task.departmentId !== departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ((baseLevel === 'MEMBER' || baseLevel === 'VIEWER') && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('assort1-files')
      .createSignedUrl(attachment.storageKey, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Supabase signed URL error:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    });
  } catch (error) {
    console.error('Task attachment download GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
