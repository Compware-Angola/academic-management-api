import { Controller, Get, Query } from '@nestjs/common';

import { FindNationalitiesDto } from './dto/find-nationalities.dto';
import { NationalityService } from './nacionalities.service';

@Controller('nacionalities')
export class NacionalitiesController {
    constructor(
        private readonly nationalityService: NationalityService,
    ) { }

    @Get()
    findAll(@Query() query: FindNationalitiesDto) {
        return this.nationalityService.findAll(query);
    }
}