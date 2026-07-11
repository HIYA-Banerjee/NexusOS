import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [userCount, orgCount, projectCount, taskCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { archivedAt: null } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
    ]);
    return { userCount, orgCount, projectCount, taskCount };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, displayName: true, role: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }
}
