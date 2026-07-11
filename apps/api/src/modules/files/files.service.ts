import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: any) {
    return this.prisma.file.create({
      data: {
        orgId,
        ownerId: userId,
        name: dto.name,
        mimeType: dto.mimeType,
        size: dto.size,
        storageKey: dto.storageKey || 'default_key',
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.file.findMany({
      where: { orgId, deletedAt: null },
    });
  }
}
