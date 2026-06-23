import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { supabase } from '@/lib/supabase';
import { EntityType } from '@prisma/client';

export async function DELETE(request: Request, props: { params: Promise<{ id: string; attachmentId: string }> }) {
  const params = await props.params;
  const taskId = params.id;
  const attachmentId = params.attachmentId;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const { id: userId, companyId, baseLevel } = userOrResponse;

  try {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true },
    });

    if (!attachment || attachment.task.companyId !== companyId || attachment.taskId !== taskId) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (attachment.uploadedById !== userId && baseLevel !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase.storage
      .from('assort1-files')
      .remove([attachment.storageKey]);

    if (deleteError) {
      console.error('Supabase remove error:', deleteError);
      // We log but continue with DB deletion, or we can fail. We'll proceed to delete DB row.
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskAttachment.delete({
        where: { id: attachmentId },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'attachment.deleted',
          entityType: EntityType.TASK_ATTACHMENT,
          entityId: attachmentId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task attachment DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
