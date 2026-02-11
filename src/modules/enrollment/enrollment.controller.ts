
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentRegistrationsUCService } from './registrations.at.UC.service';
import { EnrollmentRegistrationsUCDto } from './dto/registrations.at.UC.dto';

@ApiTags('enrollment') 
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

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



}
