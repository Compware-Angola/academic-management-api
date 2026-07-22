import { Controller, Get, Query } from '@nestjs/common';

import { GenderService } from './gender.service';
import { FindGendersDto } from './dto/find-gender.dto';

@Controller('genders')
export class GenderController {
    constructor(
        private readonly genderService: GenderService,
    ) { }

    @Get()
    findAll(@Query() query: FindGendersDto) {
        return this.genderService.findAll(query);
    }
}