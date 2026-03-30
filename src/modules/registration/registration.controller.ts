import {
  Controller,
  Get,
  Injectable,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { FindInscricaoSemUCDTO } from './dto/FindInscricaoSemUcDTO';
import { FilterListagemGeralEstudantesDto } from './dto/filter-listagem-geral-de-estudantes.dto';
import { FilterInscritosPorUcDto } from './dto/filtrar-inscritos-por-uc.dto';
import { FilterHorariosPorUcDto } from './dto/filter-horarios-por-uc.dto';

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}
  @Get('/incricao-sem-uc')
  @ApiOperation({ summary: 'Lista cadeiras do docente por curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cadeiras do docente no curso',
    type: FindInscricaoSemUCDTO,
  })
  findInscricaoSemUc(@Query(ValidationPipe) query: FindInscricaoSemUCDTO) {
    return this.registrationService.findInscricaoSemUC(query);
  }

  @Get('listagem-geral-estudantes')
  @ApiOperation({ summary: 'Listagem geral de estudantes' })
  @ApiResponse({ status: 200 })
  async listarGeralEstudantes(
    @Query() filter: FilterListagemGeralEstudantesDto,
  ) {
    return this.registrationService.listarGeralEstudantes(filter);
  }  

  @Get('inscritos-por-uc')
@ApiOperation({ summary: 'Listar inscritos por unidade curricular' })
@ApiResponse({ status: 200 })
async listarInscritosPorUc(@Query() filter: FilterInscritosPorUcDto) {
  return this.registrationService.listarInscritosPorUc(filter);
}

@Get('horarios-por-uc')
@ApiOperation({ summary: 'Listar horários por unidade curricular' })
@ApiResponse({ status: 200 })
async listarHorariosPorUc(@Query() filter: FilterHorariosPorUcDto) {
  return this.registrationService.listarHorariosPorUc(filter);
}

}
