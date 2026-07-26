import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ListarUCDocenteSemAfetacaoFiltroDto } from "./dto/listar-uc-docente-sem-afetacao-filtro.dto";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";

@Injectable()
export class UcDocenteSemAfetacaoService {
  constructor(private readonly dataSource: DataSource) { }

  async listarUC(filters: ListarUCDocenteSemAfetacaoFiltroDto) {
    const {
      anoLectivoId,
      cursoId,
      semestreId,
      classeId,
      tipoCandidaturaId,
      page = 1,
      limit = 10,
      search
    } = filters;

    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .from("FK2_TB_GRADE_CURRICULAR", "TGC")
      .innerJoin(
        "FK2_TB_DISCIPLINAS",
        "TD",
        "TD.CODIGO = TGC.CODIGO_DISCIPLINA"
      )
      .innerJoin(
        "FK2_TB_SEMESTRES",
        "TS",
        "TS.CODIGO = TGC.CODIGO_SEMESTRE"
      )
      .innerJoin(
        "FK2_TB_CURSOS",
        "TC",
        "TC.CODIGO = TGC.CODIGO_CURSO"
      )
      .where("TGC.STATUS_ IN (:...status)", { status: [1, 2] });

    if (anoLectivoId) {
      queryBuilder.andWhere(
        `TGC.CODIGO NOT IN (
          SELECT JSON_VALUE(MTDA.REF_CADEIRA, '$.pk')
          FROM FK2_MGD_TB_DOCENTE_AFECTACAO MTDA
          WHERE JSON_VALUE(MTDA.REF_ANO_LECTIVO, '$.pk') = :anoLectivoId
        )`,
        { anoLectivoId }
      );
    }

    if (tipoCandidaturaId) {
      queryBuilder.andWhere("TC.TIPO_CANDIDATURA = :tipoCandidaturaId", { tipoCandidaturaId });
    }

    if (cursoId) {
      queryBuilder.andWhere("TC.CODIGO = :cursoId", { cursoId });
    }

    if (semestreId) {
      queryBuilder.andWhere(
        "TGC.CODIGO_SEMESTRE = :semestreId",
        { semestreId }
      );
    }

    if (classeId) {
      queryBuilder.andWhere(
        "TGC.CODIGO_CLASSE = :classeId",
        { classeId }
      );
    }
    if (search) {
      queryBuilder.andWhere(
        `(
      TRANSLATE(UPPER(TD.DESIGNACAO),
                'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                'AAAAAEEEEIIIIOOOOUUUUC') LIKE TRANSLATE(UPPER(:search), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOUUUUC')
      OR
      TRANSLATE(UPPER(TC.DESIGNACAO),
                'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                'AAAAAEEEEIIIIOOOOUUUUC') LIKE TRANSLATE(UPPER(:search), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOUUUUC')
    )`,
        { search: `%${search}%` }
      );
    }
    const countQuery = queryBuilder
      .clone()
      .select("COUNT(*)", "total");

    const countResult = await countQuery.getRawOne();

    const totalItems = Number(
      countResult?.total ?? countResult?.TOTAL ?? 0
    );

    // ---------------------------
    // BUSCA PAGINADA
    // ---------------------------
    const data = await queryBuilder
      .select([
        "TC.DESIGNACAO AS CURSO",
        "TGC.CODIGO AS CODIGO_DISCIPLINA",
        "TD.DESIGNACAO AS DISCIPLINA",
        "TS.DESIGNACAO AS SEMESTRE",
        "TGC.CODIGO_CLASSE AS CLASSE",
      ])
      .orderBy("TC.DESIGNACAO", "ASC")
      .addOrderBy("TS.DESIGNACAO", "ASC")
      .addOrderBy("TGC.CODIGO_CLASSE", "ASC")
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: toLowerCaseKeys(data),
      meta: {
        total: totalItems,
        limit: limit,
        totalPages,
        page: page,
      },
    };
  }
}
