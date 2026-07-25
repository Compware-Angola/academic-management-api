import { Injectable, NotFoundException } from '@nestjs/common';
import { DefinirOralGradeDto } from './dto/definir-oral-grade.dto';
import { ListarDefinirOralDto } from './dto/listar-definir-oral.dto';
import { DataSource } from 'typeorm';
import { AtualizarStatusOralDto } from './dto/atualizar-status-oral.dto';

@Injectable()
export class DefineFormulaUcOralService {
  constructor(private readonly dataSource: DataSource) { }

  async buscar(params: ListarDefinirOralDto): Promise<DefinirOralGradeDto[]> {
    const { cursoId, anoCurricular, semestre, anoLectivo } = params;


    // 1. Buscar o plano curricular ativo (mesma lógica do outro método)
    const planoSql = `
    SELECT CODIGO
    FROM FK2_TB_PLANO_CURRICULAR_CURSO
    WHERE (CODIGO_CURSO = ${cursoId} OR ${cursoId} = 0)
      AND (CODIGO_ANO_LECTIVO = ${anoLectivo} OR ${anoLectivo} = 0)
    ORDER BY CODIGO DESC
    FETCH FIRST 1 ROW ONLY
  `;

    const planos = await this.dataSource.query(planoSql);

    if (!planos || planos.length === 0) {
      throw new NotFoundException(`Plano do Curso  não encontrado para curso ${cursoId} e ano letivo ${anoLectivo}`);
    }

    const planoCodigo = planos[0].CODIGO;

    // Montar filtros dinamicamente
    const where: string[] = [
      `pcg.CODIGO_PLANO_CURRICULAR_CURSO = :planoCodigo`,
    ];

    const binds: Record<string, any> = {
      planoCodigo,
    };

    if (cursoId && cursoId !== 0) {
      where.push(`tgc.CODIGO_CURSO = :cursoId`);
      binds.cursoId = cursoId;
    }

    if (anoCurricular && anoCurricular !== 0) {
      where.push(`tgc.CODIGO_CLASSE = :anoCurricular`);
      binds.anoCurricular = anoCurricular;
    }

    if (semestre && semestre !== 0) {
      where.push(`tgc.CODIGO_SEMESTRE = :semestre`);
      binds.semestre = semestre;
    }

    const sql = `
    SELECT
      tgc.CODIGO AS GRADE,
      td.DESIGNACAO AS DISCIPLINA,
      NVL(tgcdo.HABILITAR, 0) AS HABILITAR
    FROM FK2_TB_PLANO_CURRICULAR_GRADE pcg
    INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
      ON tgc.CODIGO = pcg.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_DISCIPLINAS td
      ON td.CODIGO = tgc.CODIGO_DISCIPLINA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL tgcdo
      ON tgcdo.CODIGOGRADECURRICULAR = tgc.CODIGO
    WHERE ${where.join("\n      AND ")}
    ORDER BY td.DESIGNACAO
  `;

    const resultado = await this.dataSource.query(sql, binds as any);
    console.log(resultado);

    return resultado.map(
      (row: any) =>
        new DefinirOralGradeDto(
          row.GRADE,
          row.DISCIPLINA,
          Number(row.HABILITAR) === 1,
        ),
    );
  }
  async atualizarStatus(dto: AtualizarStatusOralDto): Promise<void> {
    const { codigoGrade, habilitar } = dto;

    const sql = `
    MERGE INTO FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL t
    USING (SELECT ${codigoGrade} AS CODIGOGRADECURRICULAR FROM DUAL) s
    ON (t.CODIGOGRADECURRICULAR = s.CODIGOGRADECURRICULAR)
    WHEN MATCHED THEN
      UPDATE SET t.HABILITAR = ${habilitar ? 1 : 0}
    WHEN NOT MATCHED THEN
      INSERT (CODIGOGRADECURRICULAR, HABILITAR)
      VALUES (${codigoGrade}, ${habilitar ? 1 : 0})
  `;

    await this.dataSource.query(sql);
  }
}
