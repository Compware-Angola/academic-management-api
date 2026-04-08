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
