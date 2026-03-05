import { ConflictException, Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm/data-source/index.js';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindAulasAgendadasSumarioDto } from './dto/find-aulas-agendadas-sumario.dto';
import { CreateSumarioDto } from './dto/create-sumario.dto';
import { UpdateSumarioDto } from './dto/update-sumario.dto';

@Injectable()
export class SumarioService {
  constructor(private readonly dataSource: DataSource) { }
  async getAulasAgendadas(dto: FindAulasAgendadasSumarioDto) {
    const {
      docente = 0,
      unidadeCurricular = 0,
      dataInicial,
      dataFinal,
      estado = 0,
      anoLectivo = 0,
      semestre = 0,
      page = 1,
      limit = 20,
    } = dto;

    const offset = (page - 1) * limit;
    const whereParams: Record<string, any> = {
      dataInicial,
      dataFinal,
    };

    // Adiciona apenas os filtros que vieram preenchidos (≠ 0)
    if (docente !== 0) whereParams.docente = docente;

    if (unidadeCurricular !== 0) whereParams.unidadeCurricular = unidadeCurricular;

    if (estado !== 0) whereParams.estado = estado;
    if (semestre !== 0) whereParams.semestre = semestre;


    if (anoLectivo !== 0) whereParams.anoLectivo = anoLectivo;

    // Monta as condições dinamicamente
    const conditions: string[] = [
      'aa.ACTIVE_STATE = 1',
      'aa.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
    ];

    if (docente !== 0) {
      conditions.push("JSON_VALUE(aa.REF_AULA, '$.pkDocente') = :docente");
    }

    if (unidadeCurricular !== 0) {
      conditions.push("JSON_VALUE(aa.REF_AULA, '$.pkGrade') = :unidadeCurricular");
    }

    if (estado !== 0) {
      conditions.push('aa.FK_ESTADO_AGENDAMENTO = :estado');
    }
    console.log(estado);


    if (anoLectivo !== 0) {
      conditions.push("h.FK_ANO_LECTIVO = :anoLectivo");
    }

    if (semestre !== 0) {
      conditions.push("h.FK_SEMESTRE = :semestre");
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
   SELECT DISTINCT
   aa.PK_AGENDAMENTO_AULA AS codigo,
   c2.DESIGNACAO AS curso,
   d.DESIGNACAO AS unidade_curricular,
   at.DESIGNACAO  AS tipo_aula,
   al.ORDEM AS ordem_tempo,
   TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD')     AS data_aula,
  TO_CHAR(al.HORA_INICIO, 'HH24:MI')      AS hora_inicio,
  TO_CHAR(al.HORA_TERMINO, 'HH24:MI')     AS hora_fim,
   aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento_aula,
   est.DESIGNACAO AS estado_agendamento_aula_designacao,
   h.DESIGNACAO AS horario,
   au.DESIGNACAO AS sala,
   cl.DESIGNACAO AS classe,
   m.DESIGNACAO AS modalidade,
   ds.DESIGNACAO AS dia_semana,
   s.PK_TB_SUMARIO AS sumario_codigo,
   s.DESCRICAO AS sumario_descricao,
   s.FK_ESTADO_SUMARIO AS sumario_estado,
   es.DESIGNACAO AS sumario_estado_designacao,
   s.CREATED_AT AS sumario_data_criacao,
   s.UPDATED_AT AS sumario_data_atualizacao,


  JSON_VALUE(al.REF_DOCENTE, '$.nome') AS Docente
FROM FK2_MSA_TB_AGENDAMENTO_AULA aa

INNER JOIN FK2_MGH_TB_AULA al
  ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA

INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
  ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO

INNER JOIN FK2_MGH_TB_HORARIO h
  ON al.FK_HORARIO = h.PK_HORARIO

INNER JOIN FK2_TB_GRADE_CURRICULAR gc
  ON aa.FK_GRADE_CURRICULAR = gc.CODIGO

INNER JOIN FK2_TB_SALAS au
  ON JSON_VALUE(al.REF_SALA, '$.pk') = au.CODIGO

INNER JOIN FK2_MGH_TB_TIPO_AULA at
  ON at.PK_TIPO_AULA = al.FK_TIPO_AULA

INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA ds
  ON ds.PK_DIA_DA_SEMANA = al.FK_DIA_DA_SEMANA

INNER JOIN FK2_MGH_TB_MODALIDADE m
  ON m.PK_MODALIDADE = al.FK_MODALIDADE
LEFT JOIN FK2_TB_DISCIPLINAS d
  ON gc.CODIGO_DISCIPLINA = d.CODIGO

LEFT JOIN FK2_TB_CURSOS c2
  ON gc.CODIGO_CURSO = c2.CODIGO

LEFT JOIN FK2_TB_CLASSES cl
  ON gc.CODIGO_CLASSE = cl.CODIGO
  LEFT JOIN FK2_MSA_TB_SUMARIO s
  ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA
  LEFT JOIN FK2_TB_ESTADO_SUMARIO es
  ON s.FK_ESTADO_SUMARIO = es.CODIGO

${whereClause}

ORDER BY aa.PK_AGENDAMENTO_AULA ASC
OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
  `;
    const sqlParams = { ...whereParams, offset, limit };


    const countSql = `
    SELECT COUNT(DISTINCT aa.PK_AGENDAMENTO_AULA) as total
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO =est.PK_ESTADO_AGENDAMENTO
       INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
        LEFT JOIN FK2_MSA_TB_SUMARIO s
  ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA
    ${whereClause}
  `;

    try {
      const [records, countResult] = await Promise.all([
        this.dataSource.query(sql, sqlParams as any),
        this.dataSource.query(countSql, whereParams as any),
      ]);

      const total = Number(countResult?.[0]?.TOTAL ?? 0);

      return {
        data: toLowerCaseKeys(records),
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 1,
      };
    } catch (error) {
      console.error('Erro ao buscar agendamentos de al:', error);
      throw new Error(`Falha ao consultar agendamentos: ${error.message}`);
    }
  }

  async createSumario(dto:CreateSumarioDto) {
      const { descricao, fk_agendamento_aula, fk_estado_sumario } = dto;
      // verificar se  a aula ja tem um sumário ativo
      const checkSql = `
        SELECT COUNT(*) AS count
        FROM FK2_MSA_TB_SUMARIO
        WHERE FK_AGENDAMENTO_AULA = :fk_agendamento_aula
          AND ACTIVE_STATE = 1
      `;

      const checkResult = await this.dataSource.query(checkSql, { fk_agendamento_aula } as any);
      const existingCount = Number(checkResult?.[0]?.COUNT ?? 0);

      if (existingCount > 0) {
        throw new ConflictException('Já existe um sumário ativo para este agendamento de aula.');
      }
      const insertSql = `
        INSERT INTO FK2_MSA_TB_SUMARIO (DESCRICAO, FK_AGENDAMENTO_AULA, FK_ESTADO_SUMARIO, ACTIVE_STATE, CREATED_AT, UPDATED_AT)
        VALUES (:descricao, :fk_agendamento_aula, :fk_estado_sumario, 1,SYSDATE,SYSDATE)
      `;

      try {
       await this.dataSource.query(insertSql, {
          descricao,
          fk_agendamento_aula,
          fk_estado_sumario,
        } as any);

        return { success: true, message: 'Sumário criado com sucesso' };
      } catch (error) {
        console.error('Erro ao criar sumário:', error);
        throw new Error(`Falha ao criar sumário: ${error.message}`);
      }
 
  }
async updateSumario(dto: UpdateSumarioDto, codigo: number) {
  const fields = [] as string[];
  const params: any = { codigo };

  if (dto.descricao !== undefined) {
    fields.push('DESCRICAO = :descricao');
    params.descricao = dto.descricao;
  }

  if (dto.fk_agendamento_aula !== undefined) {
    fields.push('FK_AGENDAMENTO_AULA = :fk_agendamento_aula');
    params.fk_agendamento_aula = dto.fk_agendamento_aula;
  }

  if (dto.fk_estado_sumario !== undefined) {
    fields.push('FK_ESTADO_SUMARIO = :fk_estado_sumario');
    params.fk_estado_sumario = dto.fk_estado_sumario;
  }

  if (dto.active_state !== undefined) {
    fields.push('ACTIVE_STATE = :active_state');
    params.active_state = dto.active_state;
  }

  if (dto.justificacao_director !== undefined) {
    fields.push('JUSTIFICACAO_DIRECTOR = :justificacao_director');
    params.justificacao_director = dto.justificacao_director;
  }

  // Sempre atualizar data
  fields.push('UPDATED_AT = SYSDATE');

  if (fields.length === 1) { 
    throw new ConflictException('Nenhum campo enviado para atualização');
  }

  const updateSql = `
    UPDATE FK2_MSA_TB_SUMARIO
    SET ${fields.join(', ')}
    WHERE PK_TB_SUMARIO = :codigo
  `;

  try {
    await this.dataSource.query(updateSql, params);
    return { success: true, message: 'Sumário atualizado com sucesso' };
  } catch (error) {
    console.error('Erro ao atualizar sumário:', error);
    throw new Error(`Falha ao atualizar sumário: ${error.message}`);
  }
}
}