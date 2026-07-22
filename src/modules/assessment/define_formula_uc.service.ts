// define-formula-uc.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ListarUnidadesCurricularesDto } from './dto/listar-unidades-curriculares.dto';
import { UnidadeCurricularGradeDto } from './dto/unidade-curricular-grade.dto';
import { AtualizarFormulaDto } from './dto/atualizar-formula.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class DefineFormulaUcService {
  constructor(private readonly dataSource: DataSource) {}

  async listarUnidadesCurriculares(
    params: ListarUnidadesCurricularesDto,
  ): Promise<UnidadeCurricularGradeDto[]> {
    const { cursoId, anoLectivoId, anoCurricular, semestre, tipoCandidatura } =
      params;

    const planoSql = `
  SELECT pc.CODIGO
  FROM FK2_TB_PLANO_CURRICULAR_CURSO pc
  INNER JOIN FK2_TB_CURSOS tc ON tc.CODIGO = pc.CODIGO_CURSO
  WHERE (pc.CODIGO_CURSO = :cursoId OR :cursoId = 0)
    AND (pc.CODIGO_ANO_LECTIVO = :anoLectivoId OR :anoLectivoId = 0)
    AND (:tipoCandidatura IS NULL OR tc.TIPO_CANDIDATURA = :tipoCandidatura)
  ORDER BY pc.CODIGO DESC
  FETCH FIRST 1 ROW ONLY
`;

    const planos = await this.dataSource.query(planoSql, {
      cursoId,
      anoLectivoId,
      tipoCandidatura: tipoCandidatura ?? null,
    } as any);
    if (!planos || planos.length === 0) {
      throw new NotFoundException(
        `Plano não encontrado (curso: ${cursoId}, ano: ${anoLectivoId})`,
      );
    }

    const planoCodigo = planos[0].CODIGO;

    // 2. BUSCA AS DISCIPLINAS — TAMBÉM COM ? + ARRAY  UTILIZADOR
    const disciplinasSql = `
      SELECT
        PG.CODIGO AS "codigo",
        D.DESIGNACAO AS "disciplina",
        PG.NOTA_MIN_PRATICA AS "notaMinPratica",
        PG.NOTA_MIN_PRIMEIRA_FREQ AS "notaMinPrimeiraFreq",
        PG.NOTA_MIN_SEGUNDA_FREQ AS "notaMinSegundaFreq",
        PG.PESO_PRATICA AS "pesoPratica",
        PG.PESO_PRIMEIRA_FREQ AS "pesoPrimeiraFreq",
        PG.PESO_SEGUNDA_FREQ AS "pesoSegundaFreq",
        u.NOME AS "definido_por"

      FROM FK2_TB_PLANO_CURRICULAR_GRADE PG
     LEFT JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = PG.CODIGO_GRADE_CURRICULAR
     LEFT JOIN FK2_TB_DISCIPLINAS D ON D.CODIGO = GC.CODIGO_DISCIPLINA
     LEFT JOIN FK2_MCA_TB_UTILIZADOR u ON u.PK_UTILIZADOR = PG.UTILIZADOR
      WHERE PG.CODIGO_PLANO_CURRICULAR_CURSO = ${planoCodigo}
        AND PG.CODIGO_GRADE_CURRICULAR IN (
          SELECT GC.CODIGO
         FROM FK2_TB_GRADE_CURRICULAR GC
          WHERE GC.CODIGO_CURSO = ${cursoId}
            AND GC.CODIGO_CLASSE = ${anoCurricular}
            AND GC.CODIGO_SEMESTRE = ${semestre}
        )
      ORDER BY D.DESIGNACAO
    `;

    const result =
      await this.dataSource.query<UnidadeCurricularGradeDto[]>(disciplinasSql);

    return result;
  }
  async atualizarFormula(
    dto: AtualizarFormulaDto,
    updatedBy: number,
  ): Promise<UnidadeCurricularGradeDto> {
    const { codigo, ...campos } = dto;

    await this.dataSource.query(`
    UPDATE FK2_TB_PLANO_CURRICULAR_GRADE

    SET
      NOTA_MIN_PRATICA = ${campos.notaMinPratica ?? 'NOTA_MIN_PRATICA'},
      PESO_PRATICA = ${campos.pesoPratica ?? 'PESO_PRATICA'},
      NOTA_MIN_PRIMEIRA_FREQ = ${campos.notaMinPrimeiraFreq ?? 'NOTA_MIN_PRIMEIRA_FREQ'},
      PESO_PRIMEIRA_FREQ = ${campos.pesoPrimeiraFreq ?? 'PESO_PRIMEIRA_FREQ'},
      NOTA_MIN_SEGUNDA_FREQ = ${campos.notaMinSegundaFreq ?? 'NOTA_MIN_SEGUNDA_FREQ'},
      PESO_SEGUNDA_FREQ = ${campos.pesoSegundaFreq ?? 'PESO_SEGUNDA_FREQ'},

      UTILIZADOR = ${updatedBy ?? 'UTILIZADOR'},
      CODIGO_UTILIZADOR = ${updatedBy ?? 'CODIGO_UTILIZADOR'}
    WHERE CODIGO = ${codigo}
  `);

    // retorna a linha atualizada
    const [atualizado] = await this.dataSource.query(`
    SELECT * FROM FK2_TB_PLANO_CURRICULAR_GRADE WHERE CODIGO = ${codigo}
  `);
    const resultadoBonito = toLowerCaseKeys(atualizado);
    return resultadoBonito;
  }
}
