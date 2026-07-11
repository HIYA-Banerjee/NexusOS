import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, userId: string, dto: {
    title: string; description?: string; type?: TaskType; priority?: TaskPriority;
    assigneeId?: string; epicId?: string; sprintId?: string; storyPoints?: number;
    dueDate?: Date; parentId?: string;
  }) {
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (lastTask?.position ?? 0) + 1000;

    return this.prisma.task.create({
      data: {
        projectId,
        reporterId: userId,
        title: dto.title,
        description: dto.description,
        type: dto.type || TaskType.TASK,
        priority: dto.priority || TaskPriority.MEDIUM,
        assigneeId: dto.assigneeId,
        epicId: dto.epicId,
        sprintId: dto.sprintId,
        storyPoints: dto.storyPoints,
        dueDate: dto.dueDate,
        parentId: dto.parentId,
        position,
      },
      include: {
        assignee: { select: { id: true, displayName: true, avatar: true } },
        reporter: { select: { id: true, displayName: true, avatar: true } },
        labels: { include: { label: true } },
      },
    });
  }

  async findOne(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        assignee: { select: { id: true, displayName: true, avatar: true } },
        reporter: { select: { id: true, displayName: true, avatar: true } },
        epic: { select: { id: true, title: true, color: true } },
        sprint: { select: { id: true, name: true, status: true } },
        labels: { include: { label: true } },
        subtasks: { where: { deletedAt: null }, select: { id: true, title: true, status: true } },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, displayName: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        timeLogs: {
          include: { user: { select: { id: true, displayName: true } } },
          orderBy: { loggedAt: 'desc' },
        },
        _count: { select: { subtasks: true, comments: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(taskId: string, dto: {
    title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority;
    assigneeId?: string | null; storyPoints?: number; dueDate?: Date | null; sprintId?: string | null;
    epicId?: string | null; position?: number;
  }) {
    const data: any = { ...dto };
    if ((dto.status as any) === TaskStatus.DONE) data.completedAt = new Date();
    else if (dto.status && (dto.status as any) !== TaskStatus.DONE) data.completedAt = null;

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, displayName: true, avatar: true } },
        labels: { include: { label: true } },
      },
    });
  }

  async delete(taskId: string) {
    return this.prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(taskId: string, userId: string, content: string) {
    return this.prisma.taskComment.create({
      data: { taskId, authorId: userId, content },
      include: { author: { select: { id: true, displayName: true, avatar: true } } },
    });
  }

  async updateComment(commentId: string, content: string) {
    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content, editedAt: new Date() },
    });
  }

  async deleteComment(commentId: string) {
    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  // ── Time Logging ──────────────────────────────────────────────────────────

  async logTime(taskId: string, userId: string, dto: { hours: number; description?: string; loggedAt?: Date }) {
    const [log] = await this.prisma.$transaction([
      this.prisma.timeLog.create({
        data: { taskId, userId, hours: dto.hours, description: dto.description, loggedAt: dto.loggedAt },
      }),
      this.prisma.task.update({
        where: { id: taskId },
        data: { loggedHours: { increment: dto.hours } },
      }),
    ]);
    return log;
  }

  async getTimeLogs(taskId: string) {
    return this.prisma.timeLog.findMany({
      where: { taskId },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { loggedAt: 'desc' },
    });
  }

  // ── Bulk operations ───────────────────────────────────────────────────────

  async moveToSprint(taskIds: string[], sprintId: string | null) {
    return this.prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { sprintId },
    });
  }

  async bulkUpdateStatus(taskIds: string[], status: TaskStatus) {
    return this.prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status },
    });
  }
}
