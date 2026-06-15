import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PrazosService } from './prazos.service';
import {
  PrazoQueryDto,
  PrazoQueryWithoutTipoCalendario,
} from './dto/prazo-query.dto';

@Controller('prazos')
export class PrazosController {
  constructor(private readonly prazosService: PrazosService) {}


  @Get()
  async obterPrazo(@Query() query: PrazoQueryDto) {
    return this.prazosService.obterPrazo(
      query.tipo,
      query.codigo_tipo_candidatura,
      query.anoLectivo,
    );
  }

  
  async obterPrazoPorCodigo(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Query() query: PrazoQueryWithoutTipoCalendario,
  ) {
    return this.prazosService.obterPrazoPorCodigo(
      codigo,
      query.codigo_tipo_candidatura,
      query.anoLectivo,
    );
  }


}