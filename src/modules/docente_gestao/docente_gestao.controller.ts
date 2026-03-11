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
} from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { UpdateAfectacaoDTO } from './dto/update-afectacao.dto';
import { FindAfectacaoDTO } from './dto/find-afectacao.dto';

@ApiTags('docente-gestao')
@Controller('docente-gestao')
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
  @Put('/afectacao/:codigo/status')
  //@RequiredPermissions(PermissionTypeDetails.GESTAO_AFETACOES.sigla!)
  updateAfectacaoStatus(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body(ValidationPipe) query: UpdateAfectacaoDTO,
    @Req() req: any,
  ) {
    return this.service.updateAfectacaoStatus(codigo, query);
  }
}
