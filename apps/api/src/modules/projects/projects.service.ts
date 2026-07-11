import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, TaskPriority, TaskType, ProjectType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: {
    name: string; key: string; description?: string; type?: ProjectType; teamId?: string;
  }) {
    return this.prisma.project.create({
      data: {
        orgId,
        ownerId: userId,
        name: dto.name,
        key: dto.key.toUpperCase(),
        description: dto.description,
        type: dto.type || ProjectType.SCRUM,
        teamId: dto.teamId,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId, archivedAt: null },
      include: {
        _count: { select: { tasks: true, epics: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(projectId: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        epics: true,
        sprints: { where: { status: { not: 'COMPLETED' } } },
        labels: true,
        milestones: true,
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(projectId: string, dto: Partial<{ name: string; description: string; status: string; color: string }>) {
    return this.prisma.project.update({ where: { id: projectId }, data: dto as any });
  }

  async delete(projectId: string) {
    return this.prisma.project.update({ where: { id: projectId }, data: { archivedAt: new Date() } });
  }

  // ── Board View ────────────────────────────────────────────────────────────

  async getBoardData(projectId: string, sprintId?: string) {
    const statuses = [
      TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW, TaskStatus.DONE,
    ];

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(sprintId ? { sprintId } : {}),
      },
      include: {
        assignee: { select: { id: true, displayName: true, avatar: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: { position: 'asc' },
    });

    // Group by status
    const board = statuses.reduce((acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    }, {} as Record<string, typeof tasks>);

    return board;
  }

  async getBacklog(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId, sprintId: null, deletedAt: null },
      include: {
        assignee: { select: { id: true, displayName: true, avatar: true } },
        epic: { select: { id: true, title: true, color: true } },
        labels: { include: { label: true } },
      },
      orderBy: { priority: 'asc' },
    });
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  async createSprint(projectId: string, dto: { name: string; goal?: string; startDate?: Date; endDate?: Date }) {
    return this.prisma.sprint.create({ data: { projectId, ...dto } });
  }

  async getSprints(projectId: string) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startSprint(sprintId: string) {
    return this.prisma.sprint.update({ where: { id: sprintId }, data: { status: 'ACTIVE', startDate: new Date() } });
  }

  async completeSprint(sprintId: string) {
    return this.prisma.sprint.update({ where: { id: sprintId }, data: { status: 'COMPLETED', endDate: new Date() } });
  }

  // ── Epics ─────────────────────────────────────────────────────────────────

  async createEpic(projectId: string, dto: { title: string; description?: string; color?: string }) {
    return this.prisma.epic.create({ data: { projectId, ...dto } });
  }

  async getEpics(projectId: string) {
    return this.prisma.epic.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
    });
  }

  // ── Burndown Chart ────────────────────────────────────────────────────────

  async getBurndownData(sprintId: string) {
    const sprint = await this.prisma.sprint.findUniqueOrThrow({ where: { id: sprintId } });
    const tasks = await this.prisma.task.findMany({
      where: { sprintId },
      select: { storyPoints: true, status: true, completedAt: true },
    });

    const totalPoints = tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
    const donePoints = tasks
      .filter((t) => t.status === TaskStatus.DONE)
      .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    return { sprint, totalPoints, donePoints, remainingPoints: totalPoints - donePoints };
  }
}
