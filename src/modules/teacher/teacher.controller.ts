import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { RemoteJwtAuthGuard } from '../acess_management/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../acess_management/common/secret/permissions.guard';

@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('profile/:id')
  getProfile(@Param('id') id: string) {
    return this.teacherService.profile(+id);
  }
}
