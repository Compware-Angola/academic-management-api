import { Controller, Get, Param } from "@nestjs/common";
import { StudentNoteService } from "./sudents-notes.service";
import { ApiTags } from "@nestjs/swagger";
import { FindProvasRecursoDto } from "./dto/recursos.dto";
import { StudentsProvasService } from "./students-provas.service";

@ApiTags('Provas')
@Controller('students/provas')
export class StudentsProvasController {
    constructor(private readonly studentsProvasService: StudentsProvasService) { }

    @Get('recurso/:anoLectivo/:codigoMatricula')
    async cadeirasRecurso(@Param() params: FindProvasRecursoDto) {
        return this.studentsProvasService.cadeirasRecurso({
            anoLectivo: params.anoLectivo,
            codigoMatricula: params.codigoMatricula,
        });

    }
}