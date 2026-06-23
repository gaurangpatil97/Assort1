import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

const prismaMock = mockDeep<PrismaClient>();

export default prismaMock;
