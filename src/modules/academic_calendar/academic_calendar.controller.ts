import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { AcademicCalendarService } from './academic_calendar.service';

import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ViewMonthsDto } from './dto/view-months.dto';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-calendar')
export class AcademicCalendarController {
  constructor(
    private readonly academicCalendarService: AcademicCalendarService,
  ) {}
  @Get('meses-prestacoes')
  @ApiOperation({
    summary: 'Lista os meses/prestações configurados',
    description: `
    Retorna os registros ativos da tabela <code>FK2_MES_TEMP</code>.<br><br>
    <strong>Parâmetros obrigatórios:</strong><br>
    - <code>anoLectivo</code>: Ano letivo para filtrar (ex: 2025)<br><br>
    <strong>Parâmetro opcional:</strong><br>
    - <code>semestre</code>: Filtra por semestre específico (ex: 1 ou 2). Se não informado, retorna todos os semestres do ano.<br><br>
    Ordenado por <code>ORDEM_MES</code>.
  `,
  })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number, example: 23 })
  @ApiQuery({ name: 'semestre', required: false, type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos (ex: anoLectivo ausente ou inválido)',
  })
  @ApiResponse({ status: 500, description: 'Erro interno' })
  async viewMonths(@Query(ValidationPipe) params: ViewMonthsDto) {
    return this.academicCalendarService.viewMonths(params);
  }
}
