
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch current status - latest build
    const currentBuild = await prisma.agentBuild.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tasks: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Fetch historical builds - last 10 builds
    const historicalBuilds = await prisma.agentBuild.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        tasks: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Transform current status data
    const currentStatus = currentBuild
      ? {
          id: currentBuild.id,
          buildNumber: currentBuild.buildNumber,
          status: currentBuild.status,
          startedAt: currentBuild.startedAt,
          completedAt: currentBuild.completedAt,
          duration: currentBuild.duration,
          gitHubPRUrl: currentBuild.gitHubPRUrl,
          gitHubPRNumber: currentBuild.gitHubPRNumber,
          repositoryName: currentBuild.repositoryName,
          branchName: currentBuild.branchName,
          commitSha: currentBuild.commitSha,
          commitMessage: currentBuild.commitMessage,
          createdAt: currentBuild.createdAt,
          updatedAt: currentBuild.updatedAt,
          tasks: currentBuild.tasks.map((task) => ({
            id: task.id,
            buildId: task.buildId,
            name: task.name,
            description: task.description,
            status: task.status,
            order: task.order,
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            duration: task.duration,
            logs: task.logs,
            errorMessage: task.errorMessage,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          })),
          metadata: {
            totalTasks: currentBuild.tasks.length,
            completedTasks: currentBuild.tasks.filter((t) => t.status === 'SUCCESS').length,
            failedTasks: currentBuild.tasks.filter((t) => t.status === 'FAILED').length,
            skippedTasks: currentBuild.tasks.filter((t) => t.status === 'SKIPPED').length,
            successRate:
              currentBuild.tasks.length > 0
                ? Math.round(
                    (currentBuild.tasks.filter((t) => t.status === 'SUCCESS').length /
                      currentBuild.tasks.length) *
                      100
                  )
                : 0,
          },
        }
      : null;

    // Transform historical builds data