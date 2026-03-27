```typescript
// tests/api/build-history.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GET as getHistory } from '@/app/api/agents/history/route';
import { GET as getStatus } from '@/app/api/agents/status/route';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    agentBuild: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    buildTask: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

const mockPrisma = new PrismaClient();

describe('Build History API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/agents/history', () => {
    it('should fetch last 10 builds with their tasks', async () => {
      const mockBuilds = [
        {
          id: 'build-1',
          buildNumber: 1,
          status: 'SUCCESS',
          startedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-01T01:00:00'),
          duration: 3600,
          gitHubPRUrl: 'https://github.com/repo/pull/1',
          gitHubPRNumber: 1,
          repositoryName: 'test-repo',
          branchName: 'main',
          commitSha: 'abc123',
          commitMessage: 'Test commit',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          tasks: [
            {
              id: 'task-1',
              buildId: 'build-1',
              name: 'Build',
              description: 'Build task',
              status: 'SUCCESS',
              order: 1,
              startedAt: new Date('2024-01-01'),
              completedAt: new Date('2024-01-01T00:30:00'),
              duration: 1800,
              logs: 'Build successful',
              errorMessage: null,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
            {
              id: 'task-2',
              buildId: 'build-1',
              name: 'Test',
              description: 'Test task',
              status: 'SUCCESS',
              order: 2,
              startedAt: new Date('2024-01-01T00:30:00'),
              completedAt: new Date('2024-01-01T01:00:00'),