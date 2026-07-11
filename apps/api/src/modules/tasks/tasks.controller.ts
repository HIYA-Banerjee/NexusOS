import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TaskType }) @IsOptional() @IsEnum(TaskType) type?: TaskType;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() epicId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sprintId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() storyPoints?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

class UpdateTaskDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TaskStatus }) @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority }) @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() @IsString() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() storyPoints?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sprintId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() epicId?: string;
}

class LogTimeDto {
  @ApiProperty() @IsInt() hours: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() loggedAt?: string;
}

@ApiTags('Tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'tasks', version: '1' })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  create(@Param('projectId') projectId: string, @CurrentUser() user: { id: string }, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(projectId, user.id, dto as any);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('taskId') taskId: string) {
    return this.tasksService.findOne(taskId);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(taskId, dto as any);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive/delete a task' })
  delete(@Param('taskId') taskId: string) {
    return this.tasksService.delete(taskId);
  }

  @Post(':taskId/comments')
  @ApiOperation({ summary: 'Add a comment to task' })
  addComment(@Param('taskId') taskId: string, @CurrentUser() user: { id: string }, @Body('content') content: string) {
    return this.tasksService.addComment(taskId, user.id, content);
  }

  @Post(':taskId/time-logs')
  @ApiOperation({ summary: 'Log time on a task' })
  logTime(@Param('taskId') taskId: string, @CurrentUser() user: { id: string }, @Body() dto: LogTimeDto) {
    return this.tasksService.logTime(taskId, user.id, dto as any);
  }
}
