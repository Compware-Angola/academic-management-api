import { Controller, Get, Query } from "@nestjs/common";
import { DocenteCandidaturaService } from "./docente-candidatura.service";
import { FindDocenteCandidaturaDto } from "./dto/Find-docente-candidatura.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('docente-gestao')
@Controller('docente-gestao/candidatura')
export class DocenteCandidaturaController {
    constructor(private readonly service: DocenteCandidaturaService) { }
    @Get()
    async listDocenteCandidatura(@Query() filters: FindDocenteCandidaturaDto) {
        return this.service.listDocenteCandidatura(filters);
    }
}