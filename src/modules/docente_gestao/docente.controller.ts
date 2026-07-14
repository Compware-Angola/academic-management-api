import { Body, Controller, Post, Req } from '@nestjs/common';
import { DocenteService } from './docente.service';
import {
  CriarDocenteCompletoDto,
  CriarDocenteCompletoResponseDto,
} from './dto/create-docente-completo.dto';

@Controller('docentes')
export class DocenteController {
  constructor(private readonly docenteService: DocenteService) {}

  @Post('completo')
  async criarCompleto(
    @Body() dto: CriarDocenteCompletoDto,
    @Req() req: any,
  ): Promise<CriarDocenteCompletoResponseDto> {
    const usuarioLogadoId = req.user?.id ?? 1;
    return this.docenteService.criarDocenteCompleto(dto, usuarioLogadoId);
  }
}
