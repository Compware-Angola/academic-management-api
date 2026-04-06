// src/users/referencias.controller.ts

import {  BadRequestException, Param, ParseIntPipe, Patch, Put, Req } from '@nestjs/common';

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SolicitacaoService } from './solicitacao.service';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';
import { RejectarEncaminhamentoSolicitacaoDTO } from './dto/rejectar-encaminhamento-solicitacao.dto';
import { AprovarEncaminhamentoSolicitacaoDTO } from './dto/aprovar-encaminhamento-solicitacao.dto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import { FetchServicosSolicDTO } from './dto/listar-servicos-solicitacao.dto';
import { CreateAvisoUmaDto } from './dto/create.aviso.dto';
import { ListAllSolicitacoesDto } from './dto/listar-solicitacao.dto';
import { ListarAvisosPorGruposDto } from './dto/listar-avisos-por-grupos.dto';

@ApiTags('solicitacao')
@Controller('solicitacoa')
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    
  ) {}

  @Get('solicitacoes')
  @RequiredPermissions(PermissionTypeDetails.LISTAR_SOLICITACOES.sigla)
  @ApiOperation({ summary: 'Listar todas  as solicitacões encaminhadas' })
  @ApiResponse({ status: 200, type: [FetchEncaminhamentoSolicitacaoDTO] })
  async findAllEstadoCivil(@Query() query: FetchEncaminhamentoSolicitacaoDTO) {
    return this.solicitacaoService.findEncaminhamentos(query);
  }

  @Post('rejectar-solicitacao')
  @ApiOperation({ summary: 'Rejectar uma solicitação' })
  @ApiResponse({
    status: 201,
    description: 'Solicitação rejeitada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async rejetarSolicitacao(@Body() dto: RejectarEncaminhamentoSolicitacaoDTO) {
    return this.solicitacaoService.rejeitarEncaminhamento(dto);
  }

  @Post('aprovar-solicitacao')
  @ApiOperation({ summary: 'Aprovar uma solicitação' })
  @ApiResponse({
    status: 201,
    description: 'Solicitação aprovar com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async aprovarSolicitacao(@Body() dto: AprovarEncaminhamentoSolicitacaoDTO) {
    return this.solicitacaoService.aprovarEncaminhamento(
      dto,
      this.httpService,
      this.configService,
    );
  }

@Get('servicos')
@ApiOperation({ summary: 'Listar serviços por estado e ano lectivo' })
@ApiResponse({
  status: 200,
  description: 'Lista de serviços filtrados com sucesso',
})
  async listarServicos(@Query() query: FetchServicosSolicDTO) {
    return this.solicitacaoService.listarServicosSolicao(
      query.estado_solicitacao,
      query.codigo_ano_lectivo,
    );
  }

@Get('all-solicitacoes')
@RequiredPermissions(PermissionTypeDetails.LISTAR_SOLICITACOES.sigla)
@ApiOperation({ summary: 'Listar todas as solicitações' })
@ApiResponse({ status: 200 })
async findAllSolicitacoes(@Query() query: ListAllSolicitacoesDto) {
  
  return this.solicitacaoService.listarOnlySolicitacoes(query);
}

  @Get('avisos')
@ApiOperation({ summary: 'Listar avisos com paginação e filtro por assunto' })
@ApiResponse({ status: 200 })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiQuery({ name: 'assunto', required: false, type: String })
async listarAvisos(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('assunto') assunto?: string,
) {
  return this.solicitacaoService.listarAvisos({
    page: Number(page),
    limit: Number(limit),
    assunto,
  });
}

  @Post('aviso')
  @ApiOperation({ summary: 'Criar novo aviso' })
  @ApiResponse({
    status: 201,
    description: 'Aviso criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async criarAviso(
    @Body() dto: CreateAvisoUmaDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId
    //console.log("ID USER", userId)
    console.log("Backend: ", dto.userId)
    return this.solicitacaoService.createAvisoUma(
      dto
    );
  }

  @Get('roles')
  @ApiOperation({ summary: 'Listar todos os nomes de roles' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles retornada com sucesso',
  })
  async listarRoles() {
    return this.solicitacaoService.listarRoles();
  }


@Post('aviso/upload')
async uploadAvisoImagem(
  @Body('filename') filename: string,
) {
  if (!filename) {
    throw new BadRequestException('Filename é obrigatório');
  }

  await this.solicitacaoService.updateAvisoImagem(filename);

  return {
    message: 'Imagem do aviso atualizada com sucesso',
    file: filename,
  };
}

  @Get('aviso/imagem')
  @ApiOperation({ summary: 'Buscar imagem atual de abertura do portal' })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles retornada com sucesso',
  })
  async getImagemAviso() {
      const fileName = await this.solicitacaoService.getAvisoImagem();

      return {
        filename: fileName,
      };
    }

  @Put('aviso/:id')
  @ApiOperation({ summary: 'Editar aviso existente' })
  @ApiResponse({ status: 200, description: 'Aviso atualizado com sucesso' })
  async editarAviso(
    @Param('id') id: number,
    @Body() dto: CreateAvisoUmaDto,
  ) {
    return this.solicitacaoService.updateAvisoUma(Number(id), dto);
  }

@Get('avisos-por-grupo')
@ApiOperation({ summary: 'Listar avisos por grupo' })
@ApiQuery({ name: 'sigla', required: false, type: String })
@ApiQuery({ name: 'curso', required: false, type: Number })
@ApiQuery({ name: 'periodo', required: false, type: Number })
async listarAvisosPorGrupo(
  @Query('sigla') sigla?: string,
  @Query('curso') curso?: number,
  @Query('periodo') periodo?: number,
) {
  return this.solicitacaoService.listarAvisosPorGrupo({
    sigla: sigla?.trim() || undefined,
    curso: curso ? Number(curso) : undefined,
    periodo: periodo ? Number(periodo) : undefined,
  });
}

@Post('avisos-por-grupos')
@ApiOperation({ summary: 'Listar avisos por múltiplos grupos' })
 @ApiBody({ type: ListarAvisosPorGruposDto })
listarAvisosPorGrupos(@Body() body: { grupoIds?: number[] }) {
  return this.solicitacaoService.listarAvisosPorGrupos(body);
}

@Patch('aviso/:id/status')
@ApiOperation({ summary: 'Ativar ou desativar aviso' })
@ApiParam({ name: 'id', type: Number, example: 1 })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      status: { type: 'number', example: 1 },
    },
    required: ['status'],
  },
})
async alterarStatusAviso(
  @Param('id', ParseIntPipe) id: number,
  @Body('status') status: number,
) {
  return this.solicitacaoService.alterarStatusAviso(id, status);
}

}
