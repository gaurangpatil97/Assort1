import prisma from '@/lib/prisma';

export async function requireSameCompany(userId: string, resourceCompanyId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as any).status = 401;
    throw error;
  }

  // Superadmin
  if (user.companyId === null) {
    return;
  }

  if (user.companyId !== resourceCompanyId) {
    const error = new Error('Forbidden: Company mismatch');
    (error as any).status = 403;
    throw error;
  }
}
