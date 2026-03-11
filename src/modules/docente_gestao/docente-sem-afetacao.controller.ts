import { Controller, Get, Query } from "@nestjs/common";
import { ListarUCDocenteSemAfetacaoFiltroDto } from "./dto/listar-uc-docente-sem-afetacao-filtro.dto";
import { UcDocenteSemAfetacaoService } from "./docente-sem-afetacoa.service";
import { ApiTags } from "@nestjs/swagger";
@ApiTags('docente-gestao')
@Controller('docente-gestao/sem-afetacao')
export class ListarUCDocenteSemAfetacaoController {
    constructor(private readonly ucDocenteSemAfetacaoService: UcDocenteSemAfetacaoService) {}

    @Get('uc')
    async listarUC(@Query() filters: ListarUCDocenteSemAfetacaoFiltroDto) {
        return this.ucDocenteSemAfetacaoService.listarUC(filters);
    }
}