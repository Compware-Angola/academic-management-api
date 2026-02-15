// src/users/referencias.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SolicitacaoService } from './solicitacao.service';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';
import { RejectarEncaminhamentoSolicitacaoDTO } from './dto/rejectar-encaminhamento-solicitacao.dto';
import { AprovarEncaminhamentoSolicitacaoDTO } from './dto/aprovar-encaminhamento-solicitacao.dto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import { FetchServicosSolicDTO } from './dto/listar-servicos-solicitacao.dto';

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
}
