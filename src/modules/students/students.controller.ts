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
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindStudentsDTO } from './dto/find-students.dto';
import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}
  @Get('estatistic/:codigoMatricula')
  async getProfile(@Param('codigoMatricula') codigoMatricula: number) {
    return this.studentsService.getProfileEstatistic(codigoMatricula);
  }
  @Get('find/sugestoes')
  async sugestoes(@Query('search') search: string) {
    return this.studentsService.getSugestoes(search);
  }
  @Get()
  @ApiOperation({ summary: 'Listar Estudantes matriculadas' })
  @ApiResponse({
    status: 200,
    description: 'Listar Estudantes matriculadas',
    type: FindStudentsDTO,
  })
  findCadeiras(@Query(ValidationPipe) query: FindStudentsDTO) {
    return this.studentsService.findStudents(query);
  }

  @Get('mapa-anual-finalistas')
@ApiOperation({ summary: 'Mapa anual de estudantes finalistas' })
@ApiResponse({ status: 200 })
async listarMapaAnualFinalistas(
  @Query() filter: FilterMapaAnualFinalistasDto,
) {
  return this.studentsService.listarMapaAnualFinalistas(filter);
}

}
