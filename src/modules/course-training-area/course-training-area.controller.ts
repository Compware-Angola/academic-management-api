import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CourseTrainingAreaService } from './course-training-area.service';
import { FindCourseTrainingAreaDto } from './dto/find-course-training-area.dto';

@ApiTags('Course Training Areas')
@Controller('course-training-areas')
export class CourseTrainingAreaController {
    constructor(
        private readonly service: CourseTrainingAreaService,
    ) { }

    @Get()
    findAll(@Query() query: FindCourseTrainingAreaDto) {
        return this.service.findAll(query);
    }
}