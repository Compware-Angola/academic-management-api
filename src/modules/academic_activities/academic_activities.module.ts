import { Module } from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { AcademicActivitiesController } from './academic_activities.controller';
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';

@Module({
  controllers: [AcademicActivitiesController],
  providers: [AcademicActivitiesService,promptToCreateAndEditService],
})
export class AcademicActivitiesModule {}
