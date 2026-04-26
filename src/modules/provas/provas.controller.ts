import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  ValidationPipe,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ProvasService } from './provas.service';
import { FilterProvaDto } from './dto/filter-prova.dto';
import { CreateProvaDto } from './dto/create-prova.dto';
import { UpdateProvaDto } from './dto/update-prova.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('exames-de-acesso/provas')
@ApiTags('Provas')
export class ProvasController {
  constructor(private readonly provasService: ProvasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista todas as provas com filtros e paginação',
  })
  findAll(@Query(ValidationPipe) filtros: FilterProvaDto) {
    return this.provasService.findAll(filtros);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova prova',
  })
  create(@Body(ValidationPipe) createProvaDto: CreateProvaDto) {
    return this.provasService.create(createProvaDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza uma prova existente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateProvaDto: UpdateProvaDto,
  ) {
    return this.provasService.update(id, updateProvaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove uma prova',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provasService.remove(id);
  }
}
