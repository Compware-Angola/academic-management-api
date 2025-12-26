import { Injectable, NotFoundException } from '@nestjs/common';
import { DefinirOralGradeDto } from './dto/definir-oral-grade.dto';
import { ListarDefinirOralDto } from './dto/listar-definir-oral.dto';
import { DataSource } from 'typeorm';
import { AtualizarStatusOralDto } from './dto/atualizar-status-oral.dto';

@Injectable()
export class DefineFormulaUcOralService {
    constructor(private readonly dataSource: DataSource) {}

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
    throw new NotFoundException(`Plano não encontrado para curso ${cursoId} e ano letivo ${anoLectivo}`);
  }

  const planoCodigo = planos[0].CODIGO;

  // 2. Buscar as disciplinas com configuração de oral, filtrando pelo plano ativo
  const sql = `
    SELECT 
      tgc.CODIGO AS grade,
      td.DESIGNACAO AS disciplina,
      NVL(tgcdo.HABILITAR, 0) AS habilitar
    FROM FK2_TB_PLANO_CURRICULAR_GRADE pcg
    INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
      ON tgc.CODIGO = pcg.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_DISCIPLINAS td 
      ON td.CODIGO = tgc.CODIGO_DISCIPLINA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL tgcdo 
      ON tgcdo.CODIGOGRADECURRICULAR = tgc.CODIGO
    WHERE pcg.CODIGO_PLANO_CURRICULAR_CURSO = ${planoCodigo}
      AND tgc.CODIGO_CURSO = ${cursoId}
      AND tgc.CODIGO_CLASSE = ${anoCurricular}
      AND tgc.CODIGO_SEMESTRE = ${semestre}
    ORDER BY td.DESIGNACAO
  `;

  const resultado = await this.dataSource.query(sql);

  return resultado.map((row: any) =>
    new DefinirOralGradeDto(
      row.GRADE,
      row.DISCIPLINA,
      row.HABILITAR === 1,
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
