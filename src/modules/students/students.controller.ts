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
import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';
import { FilterRegistoPrimarioExamesAcessoDto } from './dto/filter-registo-primario-exames-acesso.dto';
import { FilterRegistoPrimarioMatriculadosDto } from './dto/filter-registo-primario-matriculados.dto';
import { FindStudentsDTO, ResetStudentPasswordDTO } from './dto/find-students.dto';

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

@Get('registo-primario-exames-acesso')
@ApiOperation({ summary: 'Listar registo primário de exames de acesso' })
@ApiResponse({ status: 200 })
async listarRegistoPrimarioExamesAcesso(
  @Query() filter: FilterRegistoPrimarioExamesAcessoDto,
) {
  return this.studentsService.listarRegistoPrimarioExamesAcesso(filter);
}

@Get('registo-primario-matriculados')
@ApiOperation({ summary: 'Listar registo primário de matriculados' })
@ApiResponse({ status: 200 })
async listarRegistoPrimarioMatriculados(
  @Query() filter: FilterRegistoPrimarioMatriculadosDto,
) {
  return this.studentsService.listarRegistoPrimarioMatriculados(filter);
}

  @Patch('reset-password')
  @ApiOperation({ summary: 'Resetar senha do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Senha do estudante resetada com sucesso',
    type: ResetStudentPasswordDTO,
  })
  resetPassword(@Body(ValidationPipe) body: ResetStudentPasswordDTO) {
    return this.studentsService.resetPassword(body);
  }
}
