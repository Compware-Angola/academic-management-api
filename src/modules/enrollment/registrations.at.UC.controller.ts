import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiExtraModels } from '@nestjs/swagger';  // ← adiciona ApiExtraModels

import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';
import { EnrollmentRegistrationsUCDto } from './dto/registrations.at.UC.dto';
import { GradeItemDto } from './dto/registrations.at.UC.dto';  // ← importa o GradeItemDto também!

@ApiTags('Confirmação')
@ApiExtraModels(EnrollmentRegistrationsUCDto, GradeItemDto)   // ← ISSO aqui é crucial!
@Controller('enrollment')
export class registrationsAtUcController {
  constructor(private readonly registrationService: EnrollmentRegistrationsUCService) {}

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
  async confirmMatriculaAndGrades(@Body() registrationUcDto: EnrollmentRegistrationsUCDto) {
    const response = await this.registrationService.registerGradesUc(registrationUcDto);
    return response;
  }
}