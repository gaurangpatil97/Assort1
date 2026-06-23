import { GET } from '@/app/api/tasks/route';
import prisma from '@/lib/prisma';
import * as helper from '@/app/api/helper';
import { BaseLevel } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: require('jest-mock-extended').mockDeep(),
}));
const prismaMock = prisma as any;

jest.mock('@/app/api/helper', () => ({
  getAuthUser: jest.fn(),
}));

describe('Task Scoping - GET /api/tasks', () => {
  let mockGetAuthUser: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUser = helper.getAuthUser as jest.Mock;
    prismaMock.task.findMany.mockResolvedValue([]);
  });

  it('MEMBER can only see their own tasks', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'user-member-1',
      companyId: 'company-1',
      baseLevel: BaseLevel.MEMBER,
      departmentId: 'dept-1',
    });

    const request = new Request('http://localhost/api/tasks');
    const res = await GET(request);

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          assigneeId: 'user-member-1',
        }),
      })
    );
  });

  it('MANAGER can only see tasks in their department', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'user-mgr-1',
      companyId: 'company-1',
      baseLevel: BaseLevel.MANAGER,
      departmentId: 'dept-1',
    });

    const request = new Request('http://localhost/api/tasks');
    await GET(request);

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          departmentId: 'dept-1',
        }),
      })
    );
  });

  it('ADMIN can see all tasks in the company', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'user-admin-1',
      companyId: 'company-1',
      baseLevel: BaseLevel.ADMIN,
      departmentId: null,
    });

    const request = new Request('http://localhost/api/tasks');
    await GET(request);

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
        }),
      })
    );
    
    // Ensure departmentId and assigneeId are not strictly filtered
    const callArgs = prismaMock.task.findMany.mock.calls[0][0];
    expect(callArgs?.where).not.toHaveProperty('departmentId');
    expect(callArgs?.where).not.toHaveProperty('assigneeId');
  });

  it('A user from company A cannot access tasks from company B', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'user-admin-2',
      companyId: 'company-2',
      baseLevel: BaseLevel.ADMIN,
      departmentId: null,
    });

    const request = new Request('http://localhost/api/tasks');
    await GET(request);

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-2',
        }),
      })
    );
    
    const callArgs = prismaMock.task.findMany.mock.calls[0][0];
    expect((callArgs?.where as any).companyId).not.toBe('company-1');
  });
});
