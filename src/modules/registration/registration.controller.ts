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
}
