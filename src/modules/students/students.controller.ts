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
  Patch,
  Post,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';
import { FilterRegistoPrimarioExamesAcessoDto } from './dto/filter-registo-primario-exames-acesso.dto';
import { FilterRegistoPrimarioMatriculadosDto } from './dto/filter-registo-primario-matriculados.dto';

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
import { ChangeCourseDTO } from './dto/change-course.dto';

import { StudentNoteService } from './sudents-notes.service';
import { FindStudentNoteDTO } from './dto/find-student-notes.dto';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { StudentsEnrollmentUCService } from './students-enrollment-uc.service';
import { FindPendentUCDTO } from './dto/find-pendent-uc.dto';
import { StudentsEnrollmentPendentUCService } from './students-pendent-uc.service';
import { AcademicHistoryEquivalenciaDTO } from './dto/academic-history-equivalencia.dto';
import { AcademicHistoryMigracaoDadosDTO } from './dto/academic-history-migracao.dto';
import { UpdateGradeCurricularAlunoHorarioDTO } from '../discipline/dto/update-grade-curri-curricular-aluno-horario';
import { StudentsChangeCourse } from './students-change.course.service';
import { StudentsResultPlanService } from './students-result-plan.service';
import { FindStudentClassInfoDTO } from './dto/find-student-info.dto';

import { DefinirEspecialidadeDTO } from './dto/definir-especialidade.dto';

import { DiplomarAlunoDTO } from './dto/diplomar-aluno.dto';
import { GerarDiplomaDTO } from './dto/gerar-diploma.dto';

import { GerarCertificadoDto } from './dto/gerar-certificado.dto';

import { StudentsChangeCourse } from './students-change.course.service';
import { StudentsResultPlanService } from './students-result-plan.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentNoteService: StudentNoteService,
    private readonly studentEnrollment: StudentsEnrollmentUCService,
    private readonly studentsEnrollmentPendentUCService: StudentsEnrollmentPendentUCService,
    private readonly studentsChangeCourse: StudentsChangeCourse,
    private readonly studentsResultPlanService: StudentsResultPlanService,
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
  @Get('classe-info')
  @ApiOperation({
    summary: 'Buscar classe e informações do estudante',
    description:
      'Retorna a classe com maior número de grades curriculares inscritas e os dados do estudante para um determinado ano lectivo',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do estudante e classe retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Estudante não encontrado',
  })
  async findStudentClassInfo(
    @Query(ValidationPipe) filters: FindStudentClassInfoDTO,
  ) {
    return this.studentsService.findStudentClassInfo(filters);
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
  @Put('change-course')
  @ApiOperation({ summary: 'Mudar curso do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Curso do estudante alterado com sucesso',
    type: ChangeCourseDTO,
  })
  changeCourse(@Body(ValidationPipe) body: ChangeCourseDTO) {
    return this.studentsService.changeCourse(body);
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

  @Post('/enrollment/uc')
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
  @Get('/enrollment/pendent-uc')
  @ApiOperation({ summary: 'Listar Uc pendentes de um estudante' })
  @ApiResponse({
    status: 200,
    description: 'Listar Uc pendentes de um estudante',
    type: FindPendentUCDTO,
  })
  findPendetUc(@Query(ValidationPipe) query: FindPendentUCDTO) {
    return this.studentsEnrollmentPendentUCService.findPendent(query);
  }

  @Get('academic-history-equivalencia')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  academicHistoryEquivalencia(
    @Query(ValidationPipe) query: AcademicHistoryEquivalenciaDTO,
  ) {
    return this.studentsService.academicHistoryEquivalencia(query);
  }

  @Get('academic-history-migracao-dados')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  academicHistoryMigracaoDados(
    @Query(ValidationPipe) query: AcademicHistoryMigracaoDadosDTO,
  ) {
    return this.studentsService.academicHistoryMigracaoDados(query);
  }

  @Put('horario-grade-curricular')
  @ApiOperation({ summary: 'Atualizar horário da grade curricular' })
  @ApiResponse({
    status: 200,
    description: 'Horário da grade curricular atualizado com sucesso',
  })
  updateHorarioGradeCurricular(
    @Body(ValidationPipe) body: UpdateGradeCurricularAlunoHorarioDTO,
  ) {
    return this.studentsService.updateHorarioGradeCurricular(body);
  }

  @Delete('grade-curricular/:codigoGradeCurricularAluno')
  deleteGrade(
    @Param('codigoGradeCurricularAluno', ParseIntPipe)
    codigoGradeCurricularAluno: number,
  ) {
    return this.studentsService.deleteGrade({
      codigoGradeCurricularAluno,
    });
  }

  @Put('restore-grade-curricular/:codigoGradeCurricularAluno')
  @ApiOperation({ summary: 'Restaurar grade curricular' })
  @ApiResponse({
    status: 200,
    description: 'Grade curricular restaurada com sucesso',
  })
  restoreGrade(
    @Param('codigoGradeCurricularAluno', ParseIntPipe)
    codigoGradeCurricularAluno: number,
  ) {
    return this.studentsService.restoreGrade({ codigoGradeCurricularAluno });
  }

  @Put('definir-especialidade')
  @ApiOperation({ summary: 'Definir especialidade do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Mudar curso de um aluno',
  })
  updateCurso(@Body(ValidationPipe) body: ChangeCourseDTO, @Req() req: any) {
    const user = req.user;
    return this.studentsChangeCourse.mudarCurso(user.sub, body);
  }

  @Post('gerar-diploma')
  @ApiOperation({
    summary: 'Gerar dados do diploma do estudante',
    description:
      'Obtém os dados necessários para renderização do diploma no frontend.',
  })
  @ApiBody({ type: GerarDiplomaDTO })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados do diploma gerados com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Erro ao gerar diploma',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async gerarDiploma(@Body() dto: GerarDiplomaDTO) {
    return this.studentsService.gerarDiploma(dto);
  }

  @Get('notas-certificado')
  @ApiOperation({ summary: 'Obter notas do estudante para certificado' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  findResultadoPlano(@Param('matricula', ParseIntPipe) matricula: number) {
    return this.studentsResultPlanService.findPlan(matricula);
  }

  @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Put('mudar-curso')
  @ApiOperation({ summary: 'Mudar curso de um aluno' })
  @ApiResponse({
    status: 200,
    description: 'Mudar curso de um aluno',
  })
  updateCurso(@Body(ValidationPipe) body: ChangeCourseDTO, @Req() req: any) {
    const user = req.user;
    return this.studentsChangeCourse.mudarCurso(user.sub, body);
  }

  @Get('resultado-plano/:matricula')
  @ApiOperation({ summary: 'Obter histórico acadêmico do estudante' })
  @ApiResponse({
    status: 200,
    description: 'Histórico acadêmico do estudante obtido com sucesso',
  })
  findResultadoPlano(@Param('matricula', ParseIntPipe) matricula: number) {
    return this.studentsResultPlanService.findPlan(matricula);
  }
}
