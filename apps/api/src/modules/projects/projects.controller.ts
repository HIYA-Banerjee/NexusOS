import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsEnum, IsDateString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '@prisma/client';

class CreateProjectDto {
  @ApiProperty({ example: 'My Awesome Project' }) @IsString() @MinLength(2) name: string;
  @ApiProperty({ example: 'MAP' }) @IsString() @Matches(/^[A-Z0-9]{2,8}$/, { message: 'Key must be 2-8 uppercase letters/numbers' }) key: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ProjectType }) @IsOptional() @IsEnum(ProjectType) type?: ProjectType;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
}

class CreateSprintDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goal?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

class CreateEpicDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

@ApiTags('Projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'organizations/:orgId/projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Param('orgId') orgId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(orgId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects in organization' })
  findAll(@Param('orgId') orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project details' })
  findOne(@Param('projectId') projectId: string, @Param('orgId') orgId: string) {
    return this.projectsService.findOne(projectId, orgId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('projectId') projectId: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(projectId, dto);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive project' })
  delete(@Param('projectId') projectId: string) {
    return this.projectsService.delete(projectId);
  }

  @Get(':projectId/board')
  @ApiOperation({ summary: 'Get board view (tasks grouped by status)' })
  getBoard(@Param('projectId') projectId: string, @Query('sprintId') sprintId?: string) {
    return this.projectsService.getBoardData(projectId, sprintId);
  }

  @Get(':projectId/backlog')
  @ApiOperation({ summary: 'Get backlog tasks' })
  getBacklog(@Param('projectId') projectId: string) {
    return this.projectsService.getBacklog(projectId);
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  @Post(':projectId/sprints')
  @ApiOperation({ summary: 'Create a sprint' })
  createSprint(@Param('projectId') projectId: string, @Body() dto: CreateSprintDto) {
    return this.projectsService.createSprint(projectId, dto as any);
  }

  @Get(':projectId/sprints')
  @ApiOperation({ summary: 'Get sprints' })
  getSprints(@Param('projectId') projectId: string) {
    return this.projectsService.getSprints(projectId);
  }

  @Patch('sprints/:sprintId/start')
  @ApiOperation({ summary: 'Start a sprint' })
  startSprint(@Param('sprintId') sprintId: string) {
    return this.projectsService.startSprint(sprintId);
  }

  @Patch('sprints/:sprintId/complete')
  @ApiOperation({ summary: 'Complete a sprint' })
  completeSprint(@Param('sprintId') sprintId: string) {
    return this.projectsService.completeSprint(sprintId);
  }

  @Get('sprints/:sprintId/burndown')
  @ApiOperation({ summary: 'Get burndown chart data for a sprint' })
  getBurndown(@Param('sprintId') sprintId: string) {
    return this.projectsService.getBurndownData(sprintId);
  }

  // ── Epics ─────────────────────────────────────────────────────────────────

  @Post(':projectId/epics')
  @ApiOperation({ summary: 'Create an epic' })
  createEpic(@Param('projectId') projectId: string, @Body() dto: CreateEpicDto) {
    return this.projectsService.createEpic(projectId, dto);
  }

  @Get(':projectId/epics')
  @ApiOperation({ summary: 'Get epics' })
  getEpics(@Param('projectId') projectId: string) {
    return this.projectsService.getEpics(projectId);
  }
}
