import { Controller, Get, Query } from '@nestjs/common';

import { AcademicDegreeService } from './academic-degree';
import { FindAcademicDegreesDto } from './dto/find-academic-degree.dto';

@Controller('academic-degrees')
export class AcademicDegreeController {
    constructor(
        private readonly academicDegreeService: AcademicDegreeService,
    ) { }

    @Get()
    findAll(@Query() query: FindAcademicDegreesDto) {
        return this.academicDegreeService.findAll(query);
    }
}