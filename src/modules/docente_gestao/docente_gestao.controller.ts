import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Put,
  Req,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';
import { UpdateAfectacaoDTO } from './dto/update-afectacao.dto';
import { FindAfectacaoDTO } from './dto/find-afectacao.dto';
import { FindDocenteAfectacaoDTO } from './dto/find-docente-afectacao.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { FilterDocenteDto } from './dto/filter-docente.dto';
import { FilterDocenteRegenteDto } from './dto/filter-docente-regente.dto';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateAfectacaoDTO } from './dto/create-afectaco.dto';

@ApiTags('docente-gestao')
@Controller('docente-gestao')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class DocenteGestaoController {
  constructor(private readonly service: DocenteGestaoService) {}
  @Get('/parametros')
  @ApiOperation({
    summary: 'Listar parametros',
  })
  async findAll(@Query() query: FindParametrosDocenteTO) {
    return this.service.getTeacherParameters(query);
  }
  @Patch('/parametros/:id/toggle')
  async toggle(@Param('id') id: number) {
    return this.service.toggleTeacherParameter(Number(id));
  }
  @Get('/afectacao')
  //@RequiredPermissions(PermissionTypeDetails.GESTAO_AFETACOES.sigla!)
  @ApiOperation({ summary: 'Listar Docentes Afectação' })
  @ApiResponse({
    status: 200,
    description: 'Listar Docentes Afectação',
    type: FindAfectacaoDTO,
  })
  findAfectacao(@Query(ValidationPipe) query: FindAfectacaoDTO) {
    return this.service.findAfectacao(query);
  }
  @Post('/afectacao')
  //@RequiredPermissions(PermissionTypeDetails.LANCAMENTO_PROGRAMA_UC.sigla)
  @ApiOperation({ summary: 'Cria uma afectação' })
  @ApiBody({ type: CreateAfectacaoDTO })
  @ApiResponse({
    status: 200,
    description: 'Cria uma afectação',
  })
  async createProgramaUC(
    @Body(ValidationPipe) body: CreateAfectacaoDTO,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.service.createAfectacao(user.sub, body);
  }
  @Put('/afectacao/:codigo/status')
  //@RequiredPermissions(PermissionTypeDetails.GESTAO_AFETACOES.sigla!)
  updateAfectacaoStatus(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body(ValidationPipe) query: UpdateAfectacaoDTO,
    @Req() req: any,
  ) {
    return this.service.updateAfectacaoStatus(codigo, query);
  }
  @Get('/docente/afectacao')
  //@RequiredPermissions(PermissionTypeDetails.GESTAO_AFETACOES.sigla!)
  @ApiOperation({
    summary: 'Listar Docentes Afectados ou docentes não afectados',
  })
  @ApiResponse({
    status: 200,
    description: 'Listar Docentes Afectados ou docentes não afectados',
    type: FindDocenteAfectacaoDTO,
  })
  findDocenteAfectacao(@Query(ValidationPipe) query: FindDocenteAfectacaoDTO) {
    return this.service.findDocenteAfectacao(query);
  }
  @Patch('/update-docente/:codigo')
  async updateDocente(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdateDocenteDto,
  ) {
    return this.service.updateDocente(codigo, dto);
  }

@Get('docentes')
@ApiOperation({ summary: 'Listar todos os professores por área de formação' })
@ApiResponse({ status: 200 })
async listDocentes(@Query() dto: FilterDocenteDto) {
  return this.service.listDocentes(dto);
}

@Get('docentes-regentes')
@ApiOperation({ summary: 'Listar docentes regentes com filtros' })
@ApiResponse({ status: 200 })
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
@ApiQuery({ name: 'ano_lectivo', required: false, type: Number, example: 17 })
@ApiQuery({ name: 'curso', required: false, type: Number, example: 12 })
@ApiQuery({ name: 'classe', required: false, type: Number, example: 3 })
@ApiQuery({ name: 'semestre', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'estado', required: false, type: Number, example: 0 })
@ApiQuery({ name: 'search', required: false, type: String, example: 'Topografia' })
async listDocentesRegentes(@Query() dto: FilterDocenteRegenteDto) {
  return this.service.listDocentesRegentes(dto);
}

  @Get('area-formacao-all')
  @ApiOperation({ summary: 'Listar todas as áreas de formação ativas' })
  @ApiResponse({ status: 200 })
  async areaFormacao() {
    return this.service.listAreaFormacao();
  }
  
  
}
