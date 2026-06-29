import { Controller, Get, Query } from "@nestjs/common";
import { ListarUCDocenteSemAfetacaoFiltroDto } from "./dto/listar-uc-docente-sem-afetacao-filtro.dto";
import { UcDocenteSemAfetacaoService } from "./docente-sem-afetacoa.service";
import { ApiTags } from "@nestjs/swagger";
import { PermissionTypeDetails } from "../../common/enums/permission.type";
import { RequiredPermissions } from "../../common/pipes/permissions.decorator";

@ApiTags('docente-gestao')
@Controller('docente-gestao/sem-afetacao')
export class DocenteSemAfetacaoController {
    constructor(private readonly ucDocenteSemAfetacaoService: UcDocenteSemAfetacaoService) { }
    @RequiredPermissions(PermissionTypeDetails.LISTA_UC_SEM_DOCENTES_AFETADOS.sigla!)
    @Get('uc')
    async listarUC(@Query() filters: ListarUCDocenteSemAfetacaoFiltroDto) {
        return this.ucDocenteSemAfetacaoService.listarUC(filters);
    }
}