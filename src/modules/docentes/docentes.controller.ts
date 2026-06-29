import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { DocentesService } from './docentes.service';
import {
  CreateProgramaUCDTO,
  FindDocenteCadeira,
  FindDocenteUcCurso,
  FindProgramaUCDTO,
} from './dto/find-programa-uc.dto';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CursosResponseDto } from './dto/curso';
import { CadeirasResponseDto } from './dto/cadeira';

import { UpdateProgramaStatusUCDTO } from './dto/update-programa-uc.dto';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { RequiredPermissions } from '../../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../../common/enums/permission.type';
import { FindAssiduidadeDTO } from './dto/find-assiduidade.dto';
import { FindHorarioVigilantesCDTO } from './dto/find-horario-vigilantes.dto';
import { FindAfectacaoDTO } from '../docente_gestao/dto/find-afectacao.dto';
import { UpdateAfectacaoDTO } from '../docente_gestao/dto/update-afectacao.dto';

@Controller('docentes')
//@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) { }

  @Get('/programa-uc')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_PROGRAMA_UC.sigla,
    PermissionTypeDetails.VALIDACAO_PROGRAMA_UC.sigla,
  )
  findProgramaUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findProgramaUC(query);
  }
  @Put('/programa-uc/estado/:id')
  @RequiredPermissions(PermissionTypeDetails.VALIDACAO_PROGRAMA_UC.sigla)
  updateProgramaUC(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) query: UpdateProgramaStatusUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.updateProgramaStatus(id, query);
  }

  @Put('/programa-uc/:id/visibilidade')
  @RequiredPermissions(PermissionTypeDetails.VALIDACAO_PROGRAMA_UC.sigla)
  updateProgramaUCVisibilidade(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) query: UpdateProgramaStatusUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.updateProgramaVisibilidade(id, query);
  }

  @Get('/programas-sem-ucs')
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_PROGRAMA_UC.sigla,
    PermissionTypeDetails.VALIDACAO_PROGRAMA_UC.sigla,
  )
  findProgramaSemUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findSemProgramaUC(query);
  }
  @Get(':docenteId/cursos')
  @ApiOperation({ summary: 'Lista cursos do docente' })
  @ApiParam({
    name: 'docenteId',
    type: String,
    example: '486',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos do docente',
    type: CursosResponseDto,
  })
  findCursos(
    @Param('docenteId', ParseIntPipe) docenteId: string,
    @Query(ValidationPipe) query: FindDocenteUcCurso,
  ) {
    return this.docentesService.findCursos(docenteId, query);
  }
  @Get('/cadeiras')
  @ApiOperation({ summary: 'Lista cadeiras do docente por curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cadeiras do docente no curso',
    type: CadeirasResponseDto,
  })
  findCadeiras(@Query(ValidationPipe) query: FindDocenteCadeira) {
    return this.docentesService.findCadeiras(query);
  }
  @Get('/horarios-vigilantes')
  @RequiredPermissions(PermissionTypeDetails.HORAS_DE_VIGILANCIA.sigla!)
  @ApiOperation({ summary: 'Lista Horários Vigilantes' })
  @ApiResponse({
    status: 200,
    description: 'Lista Horários Vigilantes em um prazo',
    type: CadeirasResponseDto,
  })
  findHorariosVigilantes(
    @Query(ValidationPipe) query: FindHorarioVigilantesCDTO,
  ) {
    return this.docentesService.findHorarioVigilantes(query);
  }

  @Post('/programa-uc')
  @RequiredPermissions(PermissionTypeDetails.LANCAMENTO_PROGRAMA_UC.sigla)
  @ApiOperation({ summary: 'Cria um programa UC' })
  @ApiBody({ type: CreateProgramaUCDTO })
  @ApiResponse({
    status: 200,
    description: 'Programa UC criado com sucesso',
  })
  async createProgramaUC(@Body(ValidationPipe) body: CreateProgramaUCDTO) {
    return this.docentesService.createProgramaUC(body);
  }

  @Get('assiduidade/:docenteId')
  @RequiredPermissions(PermissionTypeDetails.MINHAS_ASSIDUIDADES.sigla)
  @ApiOperation({ summary: 'Buscar assiduidade do docente por ID' })
  @ApiResponse({
    status: 200,
    description: 'Lista de agendamentos encontrada.',
  })
  async findAssiduidade(
    @Param('docenteId', ParseIntPipe) docenteId: number,
    @Query() query: FindAssiduidadeDTO,
  ) {
    return this.docentesService.findAssiduidadeDocente(docenteId, query);
  }
}
