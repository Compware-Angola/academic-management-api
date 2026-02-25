import { Controller, Get, Query, Req, ValidationPipe } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { FindProgramaUCDTO } from './dto/find-programa-uc.dto';

@Controller('docentes')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get('/programa-uc')
  findProgramaUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findProgramaUC(query);
  }
  @Get('/programas-sem-ucs')
  findProgramaSemUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findSemProgramaUC(query);
  }
}
