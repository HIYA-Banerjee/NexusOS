import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  create(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: any) {
    return this.documentsService.create(orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents in organization' })
  findAll(@Param('orgId') orgId: string) {
    return this.documentsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }
}
