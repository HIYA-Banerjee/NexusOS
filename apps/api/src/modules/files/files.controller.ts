import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: 'Register an uploaded file' })
  create(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: any) {
    return this.filesService.create(orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files in organization' })
  findAll(@Param('orgId') orgId: string) {
    return this.filesService.findAll(orgId);
  }
}
