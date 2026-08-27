import {
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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PreInscritosService } from './pre-inscritos.service';
import { CreatePreInscritoDto } from './dto/create-pre-inscrito.dto';
import { UpdatePreInscritoDto } from './dto/update-pre-inscrito.dto';
import { FindPreInscritoDto } from './dto/find-pre-inscrito.dto';

@Controller('pre-inscritos')
@ApiTags('Pré-inscritos')
export class PreInscritosController {
  constructor(private readonly service: PreInscritosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista pré-inscritos com paginação dinâmica' })
  @ApiResponse({ status: 200, description: 'Lista de pré-inscritos' })
  findAll(@Query() query: FindPreInscritoDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um pré-inscrito por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pré-inscrito' })
  @ApiResponse({ status: 200, description: 'Dados do pré-inscrito' })
  @ApiResponse({ status: 404, description: 'Pré-inscrito não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo pré-inscrito' })
  @ApiResponse({ status: 201, description: 'Pré-inscrito criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail/documento/telefone já em uso' })
  create(@Body() dto: CreatePreInscritoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar pré-inscrito' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pré-inscrito' })
  @ApiResponse({ status: 200, description: 'Pré-inscrito atualizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePreInscritoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover pré-inscrito (soft delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pré-inscrito' })
  @ApiResponse({ status: 200, description: 'Pré-inscrito removido' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
