import { Controller, Get, Query } from "@nestjs/common";
import { ListarUCDocenteSemAfetacaoFiltroDto } from "./dto/listar-uc-docente-sem-afetacao-filtro.dto";
import { UcDocenteSemAfetacaoService } from "./uc-docente-sem-afetacoa.service";
import { ApiTags } from "@nestjs/swagger";
@ApiTags('docente-gestao')
@Controller('docente-gestao')
export class ListarUCDocenteSemAfetacaoController {
    constructor(private readonly ucDocenteSemAfetacaoService: UcDocenteSemAfetacaoService) {}

    @Get('uc-docente-sem-afetacao')
    async listarUCDocenteSemAfetacao(@Query() filters: ListarUCDocenteSemAfetacaoFiltroDto) {
        return this.ucDocenteSemAfetacaoService.listarUCDocenteSemAfetacao(filters);
    }
}