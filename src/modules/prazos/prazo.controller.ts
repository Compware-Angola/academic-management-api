// prazos.controller.ts

import { Controller, Get, Query } from '@nestjs/common';

import { PrazosService } from './prazos.service';

import { PrazoQueryDto } from './dto/prazo-query.dto';

@Controller('prazos')
export class PrazosController {
  constructor(private readonly prazosService: PrazosService) {}

  @Get()
  obterPrazo(@Query() query: PrazoQueryDto) {
    return this.prazosService.obterPrazo(query.tipo, query.anoLectivo);
  }
}
