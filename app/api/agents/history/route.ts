
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch the last 10 builds with their associated tasks
    const builds = await prisma.agentBuild.findMany({
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

    // Transform the data to include metadata
    const buildsWithMetadata = builds.map((build) => ({
      id: build.id,
      buildNumber: build.buildNumber,
      status: build.status,
      startedAt: build.startedAt,
      completedAt: build.completedAt,
      duration: build.duration,
      gitHubPRUrl: build.gitHubPRUrl,
      gitHubPRNumber: build.gitHubPRNumber,
      repositoryName: build.repositoryName,
      branchName: build.branchName,
      commitSha: build.commitSha,
      commitMessage: build.commitMessage,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      tasks: build.tasks.map((task) => ({
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
        totalTasks: build.tasks.length,
        completedTasks: build.tasks.filter((t) => t.status === 'SUCCESS').length,
        failedTasks: build.tasks.filter((t) => t.status === 'FAILED').length,
        successRate:
          build.tasks.length > 0
            ? Math.round(
                (build.tasks.filter((t) => t.status === 'SUCCESS').length /
                  build.tasks.length) *
                  100
              )
            : 0,
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: buildsWithMetadata,
        count: buildsWithMetadata.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching build history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch build history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
```