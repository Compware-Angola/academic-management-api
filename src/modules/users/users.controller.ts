import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TeacherService } from './users.service';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';


@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('profile/:id')
  getProfile(@Param('id') id: string ,
  @Req() req: any


) {
  const userIdFromToken = req.user?.sub;
  if (!userIdFromToken) {
    return {
      success: false,
      message: 'User ID not found in token',
    };
  }
    return this.teacherService.profile(userIdFromToken);
  }
}
