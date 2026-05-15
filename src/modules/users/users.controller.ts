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
  Query,
} from '@nestjs/common';
import { TeacherService } from './users.service';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';


@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('users-ga')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  @Get('profile')
  getProfile(
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
  @Get('additional-information')
  getAdditionalInformation(@Req() req: any,
    @Query('anoLetivo') anoLetivo: number) {

    const userIdFromToken = req.user?.sub;
    const userRoles = req.user?.roles;
    if (!userIdFromToken) {
      return {
        success: false,
        message: 'User ID not found in token',
      };
    }
    if (!userRoles) {
      return {
        success: false,
        message: 'User roles not found in token',
      };
    }
    return this.teacherService.getAdditionalInformation(Number(userIdFromToken), userRoles, anoLetivo);
  }
}
