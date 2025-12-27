// src/grupos/grupos.controller.ts
import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { FilterGrupoDto } from './dto/filter-grupo.dto';
import { GrupoResponseDto } from './dto/grupo.response.dto';

@ApiTags('Grupos')
@ApiBearerAuth()
@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista todos os grupos (exceto unitários) com filtro opcional por estado ativo',
    description:
      'Retorna grupos onde FK_TIPO_DE_GRUPO != 2. Use ?ativo=true para ativos, ?ativo=false para inativos, ou omita para todos.',
  })
  @ApiQuery({ name: 'ativo', required: false, type: String, example: 'true' })
  @ApiResponse({ status: 200, type: [GrupoResponseDto] })
  async listarGrupos(
    @Query(ValidationPipe) filter: FilterGrupoDto,
  ): Promise<GrupoResponseDto[]> {
    return this.gruposService.listarGrupos(filter);
  }
}