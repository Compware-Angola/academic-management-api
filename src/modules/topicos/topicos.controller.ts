import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { TopicosService } from './topicos.service';
import { CreateTopicoDto } from './dto/create-topico.dto';
import { UpdateTopicoDto } from './dto/update-topico.dto';
import { FilterTopicoDto } from './dto/filter-topico.dto';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

@Controller('exames-de-acesso/topicos')
@ApiTags('Tópicos')
export class TopicosController {
  constructor(private readonly topicosService: TopicosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista todos os tópicos com filtros e paginação',
  })
  @ApiQuery({
    name: 'designacao',
    required: false,
    type: String,
    example: 'Tópicos para o Curso de Teologia',
  })
  @ApiQuery({ name: 'anoLetivoId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Lista de tópicos retornada com sucesso',
    schema: {
      example: {
        data: [
          {
            designacao: 'Tópicos para o Curso de Teologia',
            ano_lectivo_id: 1,
            ano_letivo: '2020-2021',
            arquivo: '1579770069.pdf',
            created_at: '2020-01-23T13:01:09.000Z',
            updated_at: '2020-01-23T13:01:09.000Z',
            id: 3,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  findAll(@Query(ValidationPipe) filtros: FilterTopicoDto) {
    return this.topicosService.findAll(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um tópico por ID' })
  @ApiParam({ name: 'id', description: 'ID do tópico', example: 1 })
  @ApiResponse({ status: 200, description: 'Tópico encontrado' })
  @ApiResponse({ status: 404, description: 'Tópico não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicosService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria um novo tópico',
  })
  @ApiResponse({
    status: 201,
    description: 'Tópico criado com sucesso',
    schema: {
      example: {
        message: 'Tópico criado com sucesso',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou ano letivo não encontrado',
  })
  create(@Body(ValidationPipe) createTopicoDto: CreateTopicoDto) {
    return this.topicosService.create(createTopicoDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza um tópico existente',
  })
  @ApiParam({ name: 'id', description: 'ID do tópico', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Tópico atualizado com sucesso',
    schema: {
      example: {
        message: 'Tópico atualizado com sucesso',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Tópico não encontrado' })
  @ApiResponse({
    status: 400,
    description: 'Nenhum campo para atualizar foi fornecido',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateTopicoDto: UpdateTopicoDto,
  ) {
    return this.topicosService.update(id, updateTopicoDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove um tópico',
    description: 'Exclui permanentemente um tópico da base de dados',
  })
  @ApiParam({ name: 'id', description: 'ID do tópico', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Tópico removido com sucesso',
    schema: {
      example: {
        message: 'Tópico removido com sucesso',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Tópico não encontrado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.topicosService.remove(id);
  }
}
