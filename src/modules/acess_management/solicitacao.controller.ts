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
import { CreateAvisoUmaDto } from './dto/create.aviso.dto';

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
  async findAllSolicitacoes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.solicitacaoService.listarOnlySolicitacoes({
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('avisos')
  @ApiOperation({ summary: 'Listar avisos com paginação' })
  @ApiResponse({ status: 200 })
  async listarAvisos(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.solicitacaoService.listarAvisos({
      page: Number(page),
      limit: Number(limit),
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
  async criarAviso(@Body() dto: CreateAvisoUmaDto) {
    return this.solicitacaoService.createAvisoUma(dto);
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


// @Post('aviso/upload')
// @UseInterceptors(
//   FileInterceptor('file', {
//     storage: diskStorage({
//       destination: './uploads',
//       filename: (req, file, cb) => {
//         const uniqueSuffix =
//           Date.now() + '-' + Math.round(Math.random() * 1e9);
//         const ext = extname(file.originalname);
//         cb(null, `aviso-${uniqueSuffix}${ext}`);
//       },
//     }),
//     limits: { fileSize: 10 * 1024 * 1024 },
//   }),
// )
// async uploadAvisoImagem(
//   @UploadedFile() file: Express.Multer.File,
// ) {
//   await this.solicitacaoService.updateAvisoImagem(file.filename);

//   return {
//     message: 'Imagem do aviso atualizada com sucesso',
//     file: file.filename,
//   };
// }

}
