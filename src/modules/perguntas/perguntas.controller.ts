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
import { PerguntasService } from './perguntas.service';
import { CreatePerguntaDto } from './dto/create-pergunta.dto';
import { UpdatePerguntaDto } from './dto/update-pergunta.dto';
import { FilterPerguntaDto } from './dto/filter-pergunta.dto';
import { CreateRespostaDto } from './dto/create-resposta.dto';
import { UpdateRespostaDto } from './dto/update-resposta.dto';
import { FilterDisciplinaDto } from './dto/filter-disciplina.dto';
import { FilterTipoPerguntaDto } from './dto/filter-tipo-pergunta.dto';
import { FilterTipoRespostaDto } from './dto/filter-tipo-resposta.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('exames-de-acesso/perguntas')
@ApiTags('Perguntas')
export class PerguntasController {
  constructor(private readonly perguntasService: PerguntasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista perguntas',
  })
  @ApiQuery({
    name: 'descricao',
    required: false,
    type: String,
    example: 'Existem na Biblia as chamadas Cartas Universais',
  })
  @ApiQuery({ name: 'disciplinaId', required: false, type: Number, example: 9 })
  @ApiQuery({ name: 'id', required: false, type: Number, example: 1115 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  findAll(@Query(ValidationPipe) filtros: FilterPerguntaDto) {
    return this.perguntasService.findAll(filtros);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova pergunta',
  })
  create(@Body(ValidationPipe) createPerguntaDto: CreatePerguntaDto) {
    return this.perguntasService.create(createPerguntaDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza uma pergunta',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updatePerguntaDto: UpdatePerguntaDto,
  ) {
    return this.perguntasService.update(id, updatePerguntaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove uma pergunta (soft delete)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.perguntasService.remove(id);
  }

  @Get(':id/respostas')
  @ApiOperation({
    summary: 'Lista todas as respostas de uma pergunta',
  })
  findRespostas(@Param('id', ParseIntPipe) id: number) {
    return this.perguntasService.findRespostasByPerguntaId(id);
  }

  @Post('respostas')
  @ApiOperation({
    summary: 'Cria uma nova resposta',
  })
  createResposta(@Body(ValidationPipe) createRespostaDto: CreateRespostaDto) {
    return this.perguntasService.createResposta(createRespostaDto);
  }

  @Patch('respostas/:id')
  @ApiOperation({
    summary: 'Atualiza uma resposta existente',
  })
  updateResposta(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateRespostaDto: UpdateRespostaDto,
  ) {
    return this.perguntasService.updateResposta(id, updateRespostaDto);
  }

  @Delete('respostas/:id')
  @ApiOperation({
    summary: 'Remove uma resposta',
  })
  removeResposta(@Param('id', ParseIntPipe) id: number) {
    return this.perguntasService.removeResposta(id);
  }

  @Get('disciplinas')
  @ApiOperation({
    summary: 'Lista disciplinas de admissão com paginação',
  })
  findDisciplinas(@Query(ValidationPipe) filtros: FilterDisciplinaDto) {
    return this.perguntasService.findDisciplinas(filtros);
  }

  @Get('tipos-pergunta')
  @ApiOperation({
    summary: 'Lista tipos de pergunta com paginação',
  })
  findTiposPergunta(@Query(ValidationPipe) filtros: FilterTipoPerguntaDto) {
    return this.perguntasService.findTiposPergunta(filtros);
  }

  @Get('tipos-resposta')
  @ApiOperation({
    summary: 'Lista tipos de resposta com paginação',
  })
  findTiposResposta(@Query(ValidationPipe) filtros: FilterTipoRespostaDto) {
    return this.perguntasService.findTiposResposta(filtros);
  }
}
