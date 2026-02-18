import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SuporteService } from './suporte.service';
import { FilterSuporteDto } from './dto/filter-suporte.dto';
import { CreateTipoSuporteDto } from './dto/create-tipo-suporte.dto';
import { UpdateTipoSuporteDto } from './dto/update-tipo-suporte.dto';
import { FilterTipoSuporteDto } from './dto/filter-tipo-suporte.dto';
import { CreateRespostaSuporteDto } from './dto/create-resposta-suporte.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from '../common/secret/permissions.guard';

@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('suporte')
export class SuporteController {
  constructor(private readonly suporteService: SuporteService) {}

  // ─── Solicitações (principal) ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de suporte com paginação e filtros' })
  async findAll(@Query() filter: FilterSuporteDto) {
    return this.suporteService.list(filter);
  }
  @Get('tipos')
  @ApiOperation({ summary: 'Listar todos os tipos de suporte (simples)' })
  async findAllTipos() {
    return this.suporteService.findAllTiposSuporte();
  }
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma solicitação de suporte específica' })
  @ApiResponse({ status: 200, description: 'Detalhes da solicitação e respostas' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suporteService.findOne(id);
  }

  // ─── Tipos de Suporte ──────────────────────────────────────────────────────

  @Post('tipos')
  @ApiOperation({ summary: 'Criar um novo tipo de suporte' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTipo(@Body() createDto: CreateTipoSuporteDto) {
    return this.suporteService.createTipoSuporte(createDto);
  }



  @Get('tipos-paginado')
  @ApiOperation({ summary: 'Listar tipos de suporte com paginação e pesquisa' })
  async listTiposPaginado(@Query() filter: FilterTipoSuporteDto) {
    return this.suporteService.listTiposSuporte(filter);
  }

  @Get('tipos/:id')
  @ApiOperation({ summary: 'Obter um tipo de suporte específico' })
  async findOneTipo(@Param('id', ParseIntPipe) id: number) {
    return this.suporteService.findOneTipoSuporte(id);
  }

  @Patch('tipos/:id')
  @ApiOperation({ summary: 'Atualizar um tipo de suporte' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTipo(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTipoSuporteDto,
  ) {
    return this.suporteService.updateTipoSuporte(id, updateDto);
  }

  @Delete('tipos/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar um tipo de suporte' })
  async removeTipo(@Param('id', ParseIntPipe) id: number) {
    return this.suporteService.removeTipoSuporte(id);
  }

  // ─── Responder solicitação ─────────────────────────────────────────────────

  @Post('responder/:contactosId')
  @ApiOperation({
    summary: 'Responder a uma solicitação de suporte e marcar como respondido',
  })
  @ApiParam({
    name: 'contactosId',
    description: 'ID da solicitação original (fk2_contactos.ID)',
    example: 87,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async responder(
    @Param('contactosId', ParseIntPipe) contactosId: number,
    @Body() dto: CreateRespostaSuporteDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.sub || req.user?.PK_UTILIZADOR;

    if (dto.contactos_id !== contactosId) {
      throw new BadRequestException('ID do contacto no body deve coincidir com o da URL');
    }

    return this.suporteService.responderSolicitacao(dto, userId);
  }
}