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

}
