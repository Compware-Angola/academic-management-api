import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CargosAdministrativosService } from './cargos-administrativos.service';
import { FilterCargoDto } from './dto/filter-cargo.dto';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateOcupanteDto } from './dto/update-ocupante.dto';
import { CargoResponseDto } from './dto/cargo.response.dto';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';

@ApiTags('Cargos Administrativos')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('cargos-administrativos')
export class CargosAdministrativosController {
  constructor(private readonly service: CargosAdministrativosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista todos os cargos ativos (com filtros opcionais)',
  })
  @ApiQuery({ name: 'tipoCargoId', required: false, type: Number })
  @ApiQuery({ name: 'utilizadorId', required: false, type: Number })
  async listarTodos(
    @Query() filter: FilterCargoDto,
  ): Promise<CargoResponseDto[]> {
    return this.service.listarTodos(filter);
  }

  @Get('por-utilizador/:utilizadorId')
  @ApiOperation({
    summary: 'Lista todos os cargos ativos de um utilizador específico',
  })
  async listarPorUtilizador(
    @Param('utilizadorId', ParseIntPipe) utilizadorId: number,
  ): Promise<CargoResponseDto[]> {
    return this.service.listarPorUtilizador(utilizadorId);
  }

  @Get('por-tipo/:tipoCargoId')
  @ApiOperation({ summary: 'Lista cargos ativos de um tipo específico' })
  async listarPorTipoCargo(
    @Param('tipoCargoId', ParseIntPipe) tipoCargoId: number,
  ): Promise<CargoResponseDto[]> {
    return this.service.listarPorTipoCargo(tipoCargoId);
  }

  @Post('reitoria')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Define ocupante para cargo de Reitoria' })
  @ApiBody({ type: CreateCargoDto })
  async definirCargoReitoria(
    @Body() dto: CreateCargoDto,
  ): Promise<{ message: string; pkCargo: number }> {
    const usuarioLogadoId = 146; // ← substituir por auth real (ex: @Req() req; req.user.id)
    return this.service.criarCargoReitoria(dto, usuarioLogadoId);
  }

  @Post('faculdade')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Define ocupante para cargo de Faculdade ou Curso' })
  @ApiBody({ type: CreateCargoDto })
  async definirCargoFaculdade(
    @Body() dto: CreateCargoDto,
  ): Promise<{ message: string; pkCargo: number }> {
    const usuarioLogadoId = 146; // ← substituir por auth real
    return this.service.criarCargoFaculdadeOuCurso(dto, usuarioLogadoId);
  }

  @Put(':id/ocupante')
  @ApiOperation({ summary: 'Altera o ocupante de um cargo existente' })
  @ApiBody({ type: UpdateOcupanteDto })
  async alterarOcupante(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOcupanteDto,
  ): Promise<{ message: string }> {
    const usuarioLogadoId = 146; // ← substituir por auth real
    return this.service.alterarOcupante(
      id,
      dto.novoUtilizadorId,
      usuarioLogadoId,
    );
  }

  @Delete(':id/ocupante')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove (desativa) o ocupante de um cargo' })
  async removerOcupante(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    const usuarioLogadoId = 146; // ← substituir por auth real
    return this.service.removerOcupante(id, usuarioLogadoId);
  }
}
