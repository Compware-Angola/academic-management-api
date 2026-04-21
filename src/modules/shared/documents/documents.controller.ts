import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentoUCDto } from './dto/create-document.dto';


@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) { }
  @Post('generate-code')
  @ApiOperation({
    summary: 'Gerar código de documento',
    description: 'Gera um código aleatório, regista na tabela e retorna o código gerado',
  })
  @ApiResponse({ status: 201, description: 'Código gerado com sucesso' })
  generateCode(@Body() dto: CreateDocumentoUCDto) {
    return this.documentsService.generateCode(dto);
  }


}