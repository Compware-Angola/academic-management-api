import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { CreateAcademicActivityDto } from './dto/create-academic_activity.dto';
import { UpdateAcademicActivityDto } from './dto/update-academic_activity.dto';
import { RemoteJwtAuthGuard } from '../acess_management/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../acess_management/common/secret/permissions.guard';
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(private readonly academicActivitiesService: AcademicActivitiesService) {}


  @Delete(':id')
  
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
}
