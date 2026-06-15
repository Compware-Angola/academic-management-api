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
    return this.prazosService.obterPrazo({
      tipo: query.tipo,
      anoLectivoParam: query.anoLectivo,
      codigo_tipo_candidatura: query.codigo_tipo_candidatura,
    });
  }

  @Get(':codigo')
  async obterPrazoPorCodigo(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Query() query: PrazoQueryWithoutTipoCalendario,
  ) {
    return this.prazosService.obterPrazoPorCodigo({
      codigo,
      anoLectivoParam: query.anoLectivo,
      codigo_tipo_candidatura: query.codigo_tipo_candidatura,
    });
  }


}