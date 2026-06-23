import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/app/api/helper';
import { requirePermission } from '@/lib/rbac';
import { supabase } from '@/lib/supabase';
import { EntityType, MilestoneStatus } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'image/png',
  'image/jpeg',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const milestoneId = params.id;

  const userOrResponse = await getAuthUser(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const permCheck = await requirePermission(request, 'upload_attachment');
  if (permCheck) return permCheck;

  const { id: userId, companyId } = userOrResponse;

  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        task: true,
        submissions: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!milestone || milestone.task.companyId !== companyId) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Milestone is not in SUBMITTED status' }, { status: 400 });
    }

    const latestSubmission = milestone.submissions[0];
    if (!latestSubmission) {
      return NextResponse.json({ error: 'No submission found for this milestone' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storageKey = `companies/${companyId}/milestones/${milestoneId}/${timestamp}-${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('assort1-files')
      .upload(storageKey, buffer, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    const { data: signedUrlData } = await supabase.storage
      .from('assort1-files')
      .createSignedUrl(storageKey, 60);

    const fileUrl = signedUrlData?.signedUrl || null;

    const attachment = await prisma.$transaction(async (tx) => {
      const newAttachment = await tx.milestoneAttachment.create({
        data: {
          submissionId: latestSubmission.id,
          uploadedById: userId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          storageKey,
          fileUrl,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          companyId,
          action: 'milestone_attachment.uploaded',
          entityType: EntityType.MILESTONE,
          entityId: milestoneId,
        },
      });

      return newAttachment;
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Milestone attachment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
