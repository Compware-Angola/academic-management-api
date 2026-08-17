import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TipoCalendarioService } from './tipo-calendario.service';
import { CreateTipoCalendarioDto } from './dto/create-tipo-calendario.dto';
import { UpdateTipoCalendarioDto } from './dto/update-tipo-calendario.dto';
import { FindTipoCalendarioQueryDto } from './dto/find-tipo-calendario.dto';

@Controller('tipo-calendario')
export class TipoCalendarioController {
  constructor(private readonly service: TipoCalendarioService) {}

  @Post()
  create(@Body() dto: CreateTipoCalendarioDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: FindTipoCalendarioQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':codigo')
  findOne(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.findOne(codigo);
  }

  @Patch(':codigo')
  update(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdateTipoCalendarioDto,
  ) {
    return this.service.update(codigo, dto);
  }
}
