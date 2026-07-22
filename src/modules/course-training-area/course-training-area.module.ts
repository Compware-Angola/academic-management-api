import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourseTrainingArea } from './entities/course-training-area.entity';
import { CourseTrainingAreaController } from './course-training-area.controller';
import { CourseTrainingAreaService } from './course-training-area.service';

@Module({
    imports: [TypeOrmModule.forFeature([CourseTrainingArea])],
    controllers: [CourseTrainingAreaController],
    providers: [CourseTrainingAreaService],
})
export class CourseTrainingAreaModule { }