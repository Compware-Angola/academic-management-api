import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentoUCDto } from './dto/create-document.dto';
import { PermissionsGuard } from 'src/modules/common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from 'src/modules/common/guard/remote.jwt-auth.guard';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from 'src/modules/common/helpers/access-log.helper';


@ApiTags('Documents')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService, private httpService: HttpService) { }
  @Post('generate-code')
  @ApiOperation({
    summary: 'Gerar código de validação de documento',
    description: 'Cria um código único de validação para um documento, armazena-o na base de dados e retorna o código gerado para uso posterior (ex: validação ou autenticação do documento).',
  })
  @ApiResponse({
    status: 201,
    description: 'Código de validação gerado e registado com sucesso.'
  })
  async generateCode(
    @Body() dto: CreateDocumentoUCDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const user = req.user;

    const result = await this.documentsService.generateCode(dto, user);

    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} gerou um código de validação para o documento ${dto.documento}, associado à matrícula ${dto.codigoMatricula}`,
      fkAcesso: 6,
      fkFuncionalidade: 91,
      fkUtilizadorResponsavel: user.sub,
      fkOperacaoLog: 14,
      ip: ip,
    });

    return result;
  }

  @Get("validate-document")
  async validateDocument(@Query("code") code: string, @Query("tipo_docs") tipo_docs: number) {
    if (!code) {
      throw new BadRequestException("O parâmetro 'code' é obrigatório");
    }

    return await this.documentsService.validateDocs(code, tipo_docs);
  }
}