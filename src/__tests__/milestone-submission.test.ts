import { POST as SubmitPOST } from '@/app/api/milestones/[id]/submit/route';
import { POST as ReviewPOST } from '@/app/api/milestones/[id]/review/route';
import { POST as ResubmitPOST } from '@/app/api/milestones/[id]/resubmit/route';
import prisma from '@/lib/prisma';
import * as helper from '@/app/api/helper';
import { BaseLevel, MilestoneStatus, TaskState } from '@prisma/client';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: require('jest-mock-extended').mockDeep(),
}));
const prismaMock = prisma as any;

jest.mock('@/app/api/helper', () => ({
  getAuthUser: jest.fn(),
}));

describe('Milestone Submission Flow', () => {
  let mockGetAuthUser: jest.Mock;

  beforeEach(() => {
    mockGetAuthUser = helper.getAuthUser as jest.Mock;
    
    // Default mocks for transactions to just execute the callback
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      if (typeof cb === 'function') {
        return cb(prismaMock);
      }
      return cb;
    });
    
    prismaMock.user.findUnique.mockResolvedValue({ companyId: 'company-1' } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const assigneeUser = {
    id: 'user-assignee',
    companyId: 'company-1',
    baseLevel: BaseLevel.MEMBER,
  };

  const managerUser = {
    id: 'user-manager',
    companyId: 'company-1',
    baseLevel: BaseLevel.MANAGER,
  };

  it('Test that a non-assignee cannot submit', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'user-other',
      companyId: 'company-1',
      baseLevel: BaseLevel.MEMBER,
    });

    prismaMock.milestone.findUnique.mockResolvedValue({
      id: 'ms-1',
      status: MilestoneStatus.NOT_STARTED,
      task: { companyId: 'company-1', assigneeId: 'user-assignee' },
      submissions: [],
    } as any);

    const request = new Request('http://localhost/api/milestones/ms-1/submit', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await SubmitPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toMatch(/Forbidden/);
  });

  it('Test the full happy path: submit -> review (approve) -> task completes', async () => {
    // 1. Submit
    mockGetAuthUser.mockResolvedValue(assigneeUser);
    prismaMock.milestone.findUnique.mockResolvedValue({
      id: 'ms-1',
      status: MilestoneStatus.NOT_STARTED,
      task: { companyId: 'company-1', assigneeId: 'user-assignee', createdById: 'user-creator', title: 'Task 1' },
      submissions: [],
    } as any);

    prismaMock.user.findUnique.mockResolvedValue(assigneeUser as any);
    prismaMock.milestoneSubmission.create.mockResolvedValue({ id: 'sub-1' } as any);

    let request = new Request('http://localhost/api/milestones/ms-1/submit', {
      method: 'POST',
      body: JSON.stringify({ note: 'done' }),
    });
    let response = await SubmitPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    expect(response.status).toBe(201);
    expect(prismaMock.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MilestoneStatus.SUBMITTED,
        }),
      })
    );

    // 2. Review (Approve)
    mockGetAuthUser.mockResolvedValue(managerUser);
    prismaMock.milestone.findUnique.mockResolvedValue({
      id: 'ms-1',
      status: MilestoneStatus.SUBMITTED,
      taskId: 'task-1',
      name: 'Milestone 1',
      task: {
        companyId: 'company-1',
        assigneeId: 'user-assignee',
        title: 'Task 1',
        milestones: [
          { id: 'ms-1', status: MilestoneStatus.SUBMITTED },
          { id: 'ms-2', status: MilestoneStatus.APPROVED },
        ],
      },
      submissions: [{ id: 'sub-1', attemptNumber: 1 }],
    } as any);

    request = new Request('http://localhost/api/milestones/ms-1/review', {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    response = await ReviewPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    expect(response.status).toBe(200);

    // Task completion check
    expect(prismaMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: { state: TaskState.COMPLETED },
      })
    );
  });

  it('Test that a MEMBER cannot call the review endpoint', async () => {
    mockGetAuthUser.mockResolvedValue(assigneeUser); // MEMBER

    const request = new Request('http://localhost/api/milestones/ms-1/review', {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    const response = await ReviewPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toMatch(/Forbidden/);
  });

  it('Test that newDeadline cannot be in the past on rejection', async () => {
    mockGetAuthUser.mockResolvedValue(managerUser);
    
    const request = new Request('http://localhost/api/milestones/ms-1/review', {
      method: 'POST',
      body: JSON.stringify({
        decision: 'REJECT',
        note: 'needs work',
        newDeadline: '2000-01-01T00:00:00.000Z',
      }),
    });
    const response = await ReviewPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.details[0].message).toMatch(/cannot be in the past/);
  });

  it('Test that resubmit fails if milestone is not in REJECTED status', async () => {
    mockGetAuthUser.mockResolvedValue(assigneeUser);
    prismaMock.milestone.findUnique.mockResolvedValue({
      id: 'ms-1',
      status: MilestoneStatus.NOT_STARTED,
      task: { companyId: 'company-1', assigneeId: 'user-assignee' },
      submissions: [],
    } as any);

    const request = new Request('http://localhost/api/milestones/ms-1/resubmit', {
      method: 'POST',
      body: JSON.stringify({ note: 'try again' }),
    });
    const response = await ResubmitPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/not in REJECTED status/);
  });

  it('Test rejection flow and that submittedAt is never overwritten on resubmission', async () => {
    mockGetAuthUser.mockResolvedValue(assigneeUser);
    const mockDate = new Date('2025-01-01T00:00:00Z');

    prismaMock.milestone.findUnique.mockResolvedValue({
      id: 'ms-1',
      status: MilestoneStatus.REJECTED,
      submittedAt: mockDate,
      task: { companyId: 'company-1', assigneeId: 'user-assignee', createdById: 'user-creator', title: 'Task 1' },
      submissions: [{ attemptNumber: 1 }],
    } as any);

    prismaMock.user.findUnique.mockResolvedValue(assigneeUser as any);
    prismaMock.milestoneSubmission.create.mockResolvedValue({ id: 'sub-2' } as any);

    const request = new Request('http://localhost/api/milestones/ms-1/resubmit', {
      method: 'POST',
      body: JSON.stringify({ note: 'resubmitted' }),
    });
    const response = await ResubmitPOST(request, { params: Promise.resolve({ id: 'ms-1' }) });
    expect(response.status).toBe(201);

    const updateCall = prismaMock.milestone.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe(MilestoneStatus.SUBMITTED);
    expect(updateCall.data.resubmittedAt).toBeDefined();
    // Ensure submittedAt is not in the data payload (meaning it's not overwritten)
    expect(updateCall.data).not.toHaveProperty('submittedAt');
  });
});
