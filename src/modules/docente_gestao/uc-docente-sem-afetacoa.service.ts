import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ListarUCDocenteSemAfetacaoFiltroDto } from "./dto/listar-uc-docente-sem-afetacao-filtro.dto";

@Injectable()
export class UcDocenteSemAfetacaoService {
    constructor(private readonly dataSource: DataSource) {}

    async listarUCDocenteSemAfetacao(filters: ListarUCDocenteSemAfetacaoFiltroDto) {
        const { anoLectivoId, cursoId, semestreId, classeId } = filters;

        const queryBuilder = this.dataSource.createQueryBuilder()
            .select([
                "TC.DESIGNACAO AS CURSO",
                "TGC.CODIGO AS CODIGO_DISCIPLINA",
                "TD.DESIGNACAO AS DISCIPLINA",
                "TS.DESIGNACAO AS SEMESTRE",
                "TGC.CODIGO_CLASSE AS CLASSE"
            ])
            .from("FK2_TB_GRADE_CURRICULAR", "TGC")
            .innerJoin("FK2_TB_DISCIPLINAS", "TD", "TD.CODIGO = TGC.CODIGO_DISCIPLINA")
            .innerJoin("FK2_TB_SEMESTRES", "TS", "TS.CODIGO = TGC.CODIGO_SEMESTRE")
            .innerJoin("FK2_TB_CURSOS", "TC", "TC.CODIGO = TGC.CODIGO_CURSO")
            // Filtro base de status (sempre aplicado)
            .where("TGC.STATUS_ IN (:...status)", { status: [1, 2] });

        // --- FILTROS DINÂMICOS ---

        // Se o ano lectivo for passado, filtra as que NÃO estão afetadas naquele ano
        if (anoLectivoId) {
            queryBuilder.andWhere(`TGC.CODIGO NOT IN (
                SELECT JSON_VALUE(MTDA.REF_CADEIRA, '$.pk')
                FROM FK2_MGD_TB_DOCENTE_AFECTACAO MTDA
                WHERE JSON_VALUE(MTDA.REF_ANO_LECTIVO, '$.pk') = :anoLectivoId
            )`, { anoLectivoId });
        }

        if (cursoId) {
            queryBuilder.andWhere("TC.CODIGO = :cursoId", { cursoId });
        }

        if (semestreId) {
            queryBuilder.andWhere("TGC.CODIGO_SEMESTRE = :semestreId", { semestreId });
        }

        if (classeId) {
            queryBuilder.andWhere("TGC.CODIGO_CLASSE = :classeId", { classeId });
        }

        // Ordenação
        queryBuilder
            .orderBy("CURSO", "ASC")
            .addOrderBy("SEMESTRE", "ASC")
            .addOrderBy("CLASSE", "ASC");

        return await queryBuilder.getRawMany();
    }
}