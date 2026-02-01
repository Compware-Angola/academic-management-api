// src/enrollment/enrollment.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';
import { EnrollmentRegistrationsUCDto } from './dto/registrations.at.UC.dto';

@ApiTags('enrollment') // aparece como "enrollment" no menu do Swagger
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService, private readonly registrationService: EnrollmentRegistrationsUCService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria uma matrícula para um aluno a partir de uma pré-inscrição',
    description:
      'Regista a matrícula do aluno, associa grades curriculares e cria registos de confirmação. ' +
      'Requer código de pré-inscrição válido e lista de grades curriculares.',
  })
  @ApiBody({
    type: EnrollmentDto,
    description: 'Dados necessários para efectuar a matrícula',
  })
  async enrollment(@Body() enrollmentDto: EnrollmentDto) {
    const response = await this.enrollmentService.enrollment(enrollmentDto);
    return response;
  }


  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma a matrícula e as grades curriculares de um aluno',
    description:
      'Confirma a matrícula do aluno com base no código de pré-inscrição fornecido ' +
      'e associa as grades curriculares selecionadas.',
  })
  @ApiBody({
    type: EnrollmentRegistrationsUCDto,
    description: 'Dados necessários para confirmar a matrícula e as grades',
  })
  async confirmMatriculaAndGrades(@Body() registrationUcDto:EnrollmentRegistrationsUCDto) {
    const response = await this.registrationService.registerGradesUc(registrationUcDto);
    return response;
  }
}
