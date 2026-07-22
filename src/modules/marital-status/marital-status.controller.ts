import { Controller, Get, Query } from '@nestjs/common';

import { FindMaritalStatusDto } from './dto/find-marital-status.dto';
import { MaritalStatusService } from './marital-status.service';

@Controller('marital-status')
export class MaritalStatusController {
    constructor(
        private readonly maritalStatusService: MaritalStatusService,
    ) { }

    @Get()
    findAll(@Query() query: FindMaritalStatusDto) {
        return this.maritalStatusService.findAll(query);
    }
}