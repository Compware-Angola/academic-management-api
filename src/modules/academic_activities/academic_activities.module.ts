import { Module } from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { AcademicActivitiesController } from './academic_activities.controller';
import { promptToCreateAndEditService } from './prompt-to-create-and-edit.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';

@Module({
    imports: [TypeOrmModule.forFeature([AcademicYear]),HttpModule.register({
      timeout: 5000,
      maxRedirects: 5
    })],
  controllers: [AcademicActivitiesController],
  providers: [AcademicActivitiesService,promptToCreateAndEditService,AnoLectivoUtil],
})
export class AcademicActivitiesModule {}
