// src/users/referencias.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ReferenciasService } from './referencias.service';
import { ReferenciaDto } from '../shared/dto/referencia.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SolicitacaoService } from './solicitacao.service';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';

@ApiTags('solicitacao')
@Controller('solicitacoa')
export class SolicitacaoController {
  constructor(private readonly solicitacaoService: SolicitacaoService) {}

  @Get('solicitacoes')
  @ApiOperation({ summary: 'Listar todas  as solicitacões encaminhadas' })
  @ApiResponse({ status: 200, type: [FetchEncaminhamentoSolicitacaoDTO] })
  async findAllEstadoCivil(@Query() query: FetchEncaminhamentoSolicitacaoDTO) {
    return this.solicitacaoService.findEncaminhamentos(query);
  }
}
