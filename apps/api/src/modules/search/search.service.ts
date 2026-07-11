import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(orgId: string, query: string) {
    // Basic database search fallback for Phase 1
    const [tasks, documents, channels] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          projectId: { in: (await this.prisma.project.findMany({ where: { orgId }, select: { id: true } })).map(p => p.id) },
          title: { contains: query, mode: 'insensitive' },
        },
        take: 10,
      }),
      this.prisma.document.findMany({
        where: {
          orgId,
          title: { contains: query, mode: 'insensitive' },
        },
        take: 10,
      }),
      this.prisma.channel.findMany({
        where: {
          orgId,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
      }),
    ]);

    return {
      tasks,
      documents,
      channels,
    };
  }
}
