import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelType } from '@prisma/client';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: { name: string; type?: ChannelType; description?: string }) {
    return this.prisma.channel.create({
      data: {
        orgId,
        name: dto.name,
        type: dto.type || ChannelType.PUBLIC,
        description: dto.description,
        createdById: userId,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
    });
  }

  async findAll(orgId: string, userId: string) {
    return this.prisma.channel.findMany({
      where: {
        orgId,
        members: { some: { userId } },
      },
    });
  }

  async findMessages(channelId: string) {
    return this.prisma.message.findMany({
      where: { channelId },
      include: {
        author: { select: { id: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
