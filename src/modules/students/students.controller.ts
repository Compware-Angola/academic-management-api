import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
  Put,
  UsePipes,
  HttpStatus,
  UseGuards,
  Req,
  Post,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  FindStudentsDTO,
  ResetStudentPasswordDTO,
  UpdateStudentContactDTO,
  UpdateStudentPersonalDataDTO,
} from './dto/find-students.dto';
import { ActivateRegistrationDTO } from './dto/activate-registration.dto';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { AcademicHistoryDTO } from './dto/academic-history';
import { StudentNoteService } from './sudents-notes.service';
import { FindStudentNoteDTO } from './dto/find-student-notes.dto';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { StudentsEnrollmentUCService } from './students-enrollment-uc.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentNoteService: StudentNoteService,
    private readonly studentEnrollment: StudentsEnrollmentUCService,
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
  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Put('active-registration')
  @ApiOperation({
    summary: 'Ativar matrícula de um estudante',
    description:
      'Ativa a matrícula do aluno e desativa automaticamente todas as isenções existentes.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Matrícula ativada com sucesso',
    schema: {
      example: {
        mensagem: 'Estado do estudante João Silva Definido',
        sucesso: true,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Erro ao ativar matrícula',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async ativarMatricula(@Body() dto: ActivateRegistrationDTO, @Req() req: any) {
    const usuarioLogado = req.user;
    return this.studentsService.activateRegistration(dto, usuarioLogado);
  }

  @Get('academic-history')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
    type: AcademicHistoryDTO,
  })
  academicHistory(@Query(ValidationPipe) query: AcademicHistoryDTO) {
    return this.studentsService.academicHistory(query);
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

  @Post('/enrollment-uc')
  @ApiOperation({ summary: 'Fazer inscrição em UC' })
  @ApiBody({ type: CreateStudentEnrollmentUC })
  @ApiResponse({
    status: 200,
    description: 'Fazer inscrição em UC',
  })
  async createEnrollmentUc(
    @Body(ValidationPipe) body: CreateStudentEnrollmentUC,
  ) {
    return this.studentEnrollment.enrollmentUc(body);
  }
}
