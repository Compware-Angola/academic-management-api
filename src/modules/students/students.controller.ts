import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
  Put,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  FindStudentsDTO,
  ResetStudentPasswordDTO,
  UpdateStudentContactDTO,
  UpdateStudentPersonalDataDTO,
} from './dto/find-students.dto';
import { StudentNoteService } from './sudents-notes.service';
import { FindStudentNoteDTO } from './dto/find-student-notes.dto';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentNoteService: StudentNoteService,
  ) {}
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

  @Put('reset-password')
  @ApiOperation({ summary: 'Resetar senha do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Senha do estudante resetada com sucesso',
    type: ResetStudentPasswordDTO,
  })
  resetPassword(@Body(ValidationPipe) body: ResetStudentPasswordDTO) {
    return this.studentsService.resetPassword(body);
  }

  @Put('contactos')
  @ApiOperation({ summary: 'Atualizar contactos do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Contactos do estudante atualizados com sucesso',
    type: UpdateStudentContactDTO,
  })
  updateContactos(@Body(ValidationPipe) body: UpdateStudentContactDTO) {
    return this.studentsService.updateContactos(body);
  }

  @Put('personal-data')
  @ApiOperation({ summary: 'Atualizar dados pessoais do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Dados pessoais do estudante atualizados com sucesso',
    type: UpdateStudentPersonalDataDTO,
  })
  updatePersonalData(@Body(ValidationPipe) body: UpdateStudentPersonalDataDTO) {
    return this.studentsService.updatePersonalData(body);
  }

  @Get('notes')
  @ApiOperation({ summary: 'Listar Notas de Estudantes matriculadas' })
  @ApiResponse({
    status: 200,
    description: 'Listar  Notas de Estudantes matriculadas',
    type: FindStudentsDTO,
  })
  findStudentNotes(@Query(ValidationPipe) query: FindStudentNoteDTO) {
    return this.studentNoteService.findAll(query);
  }
}
