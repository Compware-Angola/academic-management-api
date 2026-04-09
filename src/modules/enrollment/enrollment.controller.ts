
import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
<<<<<<< HEAD
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
=======
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
>>>>>>> d4cbcda45520edada18ccfc8ec0b47514c9cd033
import { EnrollmentService } from './enrollment.service';
import { EnrollmentDto } from './dto/create-enrollment.dto';
import { EstudantesService } from './estatiticas.service';
import { EstudanteDTO } from './dto/estudante.dto';

@ApiTags('enrollment') 
@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService, private readonly estudantesService: EstudantesService) {}

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
<<<<<<< HEAD
=======



  @Get("estatisticas")
  @HttpCode(HttpStatus.OK)
  async findEstudantes(
    @Query() estudanteDto: EstudanteDTO
  ) {
   return this.estudantesService.findEstudantes(estudanteDto);
  }
>>>>>>> d4cbcda45520edada18ccfc8ec0b47514c9cd033
}
