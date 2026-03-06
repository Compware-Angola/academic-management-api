import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm/data-source/index.js';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindAulasAgendadasSumarioDto } from './dto/find-aulas-agendadas-sumario.dto';
import { CreateSumarioDto } from './dto/create-sumario.dto';
import { UpdateSumarioDto } from './dto/update-sumario.dto';
import { FindSumarioDto } from './dto/find-sumario.dto';

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

  INNER JOIN FK2_MGD_TB_DOCENTE d2
  ON JSON_VALUE(aa.REF_AULA, '$.pkDocente') = d2.CODIGO

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
async getEstatisticaSumarioAssiduidade(dto: FindAulasAgendadasSumarioDto) {
  const {
    docente = 0,
    dataInicial,
    dataFinal,
    anoLectivo = 0,
    semestre = 0,
    page = 1,
    limit = 20,
  } = dto;

  const offset = (page - 1) * limit;

  const paramsData: any = { dataInicial, dataFinal, offset, limit };
  const paramsCount: any = { dataInicial, dataFinal };

  const conditions: string[] = [
    "aa.ACTIVE_STATE = 1",
    "aa.DATA_AULA BETWEEN :dataInicial AND :dataFinal",
  ];

  if (docente !== 0) {
    conditions.push("JSON_VALUE(aa.REF_AULA,'$.pkDocente') = :docente");
    paramsData.docente = docente;
    paramsCount.docente = docente;
  }

  if (anoLectivo !== 0) {
    conditions.push("h.FK_ANO_LECTIVO = :anoLectivo");
    paramsData.anoLectivo = anoLectivo;
    paramsCount.anoLectivo = anoLectivo;
  }

  if (semestre !== 0) {
    conditions.push("h.FK_SEMESTRE = :semestre");
    paramsData.semestre = semestre;
    paramsCount.semestre = semestre;
  }

  const whereClause = "WHERE " + conditions.join(" AND ");

  const sql = `
SELECT
  MIN(aa.PK_AGENDAMENTO_AULA) AS codigo_agendamento,
  JSON_VALUE(al.REF_DOCENTE,'$.nome') AS docente,
  d.DESIGNACAO AS unidade_curricular,
  MIN(h.DESIGNACAO) AS horario,
  MIN(c2.DESIGNACAO) AS curso,

  /* CONTROLE DE SUMARIOS */
  SUM(CASE WHEN s.PK_TB_SUMARIO IS NULL THEN 1 ELSE 0 END) AS sumarios_pendentes,
  SUM(CASE WHEN s.PK_TB_SUMARIO IS NOT NULL THEN 1 ELSE 0 END) AS sumarios_lancados,
  COUNT(*) AS total_sumarios,

  /* CONTROLE DE ASSIDUIDADES */
  SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS assid_pendentes,
  SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS assid_presenca,
  SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS assid_falta,
  COUNT(*) AS total_assid,

  /* SUMARIO COM PRESENCA */
  SUM(
    CASE 
      WHEN aa.FK_ESTADO_AGENDAMENTO = 3 
      AND s.PK_TB_SUMARIO IS NOT NULL 
      THEN 1 
      ELSE 0 
    END
  ) AS sumario_com_assid

FROM FK2_MSA_TB_AGENDAMENTO_AULA aa

INNER JOIN FK2_MGH_TB_AULA al
  ON JSON_VALUE(aa.REF_AULA,'$.pkAula') = al.PK_AULA

INNER JOIN FK2_MGH_TB_HORARIO h
  ON al.FK_HORARIO = h.PK_HORARIO

INNER JOIN FK2_TB_GRADE_CURRICULAR gc
  ON aa.FK_GRADE_CURRICULAR = gc.CODIGO

LEFT JOIN FK2_TB_DISCIPLINAS d
  ON gc.CODIGO_DISCIPLINA = d.CODIGO

LEFT JOIN FK2_TB_CURSOS c2
  ON gc.CODIGO_CURSO = c2.CODIGO

LEFT JOIN FK2_MSA_TB_SUMARIO s
  ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA

${whereClause}

GROUP BY
  JSON_VALUE(al.REF_DOCENTE,'$.nome'),
  d.DESIGNACAO

ORDER BY docente

OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
`;

  const countSql = `
SELECT COUNT(*) AS total FROM (
  SELECT
    JSON_VALUE(al.REF_DOCENTE,'$.nome'),
    d.DESIGNACAO
  FROM FK2_MSA_TB_AGENDAMENTO_AULA aa

  INNER JOIN FK2_MGH_TB_AULA al
    ON JSON_VALUE(aa.REF_AULA,'$.pkAula') = al.PK_AULA

  INNER JOIN FK2_MGH_TB_HORARIO h
    ON al.FK_HORARIO = h.PK_HORARIO

  INNER JOIN FK2_TB_GRADE_CURRICULAR gc
    ON aa.FK_GRADE_CURRICULAR = gc.CODIGO

  LEFT JOIN FK2_TB_DISCIPLINAS d
    ON gc.CODIGO_DISCIPLINA = d.CODIGO

  LEFT JOIN FK2_TB_CURSOS c2
    ON gc.CODIGO_CURSO = c2.CODIGO

  LEFT JOIN FK2_MSA_TB_SUMARIO s
    ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA

  ${whereClause}

  GROUP BY
    JSON_VALUE(al.REF_DOCENTE,'$.nome'),
    d.DESIGNACAO
)
`;

  try {
    const [records, countResult] = await Promise.all([
      this.dataSource.query(sql, paramsData),
      this.dataSource.query(countSql, paramsCount),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data: records.map((r) => ({
        codigo_agendamento: r.CODIGO_AGENDAMENTO,
        docente: r.DOCENTE,
        unidadeCurricular: r.UNIDADE_CURRICULAR,
        horario: r.HORARIO,
        curso: r.CURSO,

        controleSumarios: {
          pendentes: Number(r.SUMARIOS_PENDENTES),
          lancados: Number(r.SUMARIOS_LANCADOS),
          total: Number(r.TOTAL_SUMARIOS),
        },

        controleAssiduidade: {
          pendentes: Number(r.ASSID_PENDENTES),
          presenca: Number(r.ASSID_PRESENCA),
          falta: Number(r.ASSID_FALTA),
          total: Number(r.TOTAL_ASSID),
        },

        sumarioComAssiduidade: Number(r.SUMARIO_COM_ASSID),
      })),

      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    throw new Error(`Falha ao consultar estatísticas: ${error.message}`);
  }
}
async getSumarios(dto: FindSumarioDto) {
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
  
  };

  if (docente !== 0) whereParams.docente = docente;
  if (unidadeCurricular !== 0) whereParams.unidadeCurricular = unidadeCurricular;
  if (estado !== 0) whereParams.estado = estado;
  if (semestre !== 0) whereParams.semestre = semestre;
  if (anoLectivo !== 0) whereParams.anoLectivo = anoLectivo;
  if( dataInicial !== undefined && dataInicial !== null && dataFinal !== undefined && dataFinal !== null) {
     whereParams.dataInicial =dataInicial
    whereParams.dataFinal =dataFinal
  }
  


  const conditions: string[] = [
    'aa.ACTIVE_STATE = 1',
   
  ];

  if (dataInicial && dataFinal) {
    conditions.push('aa.DATA_AULA BETWEEN :dataInicial AND :dataFinal');
  }
  if (docente !== 0) {
    conditions.push("JSON_VALUE(aa.REF_AULA, '$.pkDocente') = :docente");
  }

  if (unidadeCurricular !== 0) {
    conditions.push("JSON_VALUE(aa.REF_AULA, '$.pkGrade') = :unidadeCurricular");
  }

  if (estado !== 0) {
    conditions.push('s.FK_ESTADO_SUMARIO = :estado');
  }

  if (anoLectivo !== 0) {
    conditions.push('h.FK_ANO_LECTIVO = :anoLectivo');
  }

  if (semestre !== 0) {
    conditions.push('h.FK_SEMESTRE = :semestre');
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
SELECT DISTINCT
   s.PK_TB_SUMARIO AS sumario_codigo,
   s.DESCRICAO AS sumario_descricao,
   s.FK_ESTADO_SUMARIO AS sumario_estado,
   es.DESIGNACAO AS sumario_estado_designacao,
   s.CREATED_AT AS sumario_data_criacao,
   s.UPDATED_AT AS sumario_data_atualizacao,

   aa.PK_AGENDAMENTO_AULA AS codigo,

   c2.DESIGNACAO AS curso,
   d.DESIGNACAO AS unidade_curricular,
   at.DESIGNACAO  AS tipo_aula,
   al.ORDEM AS ordem_tempo,

   TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD') AS data_aula,
   TO_CHAR(al.HORA_INICIO, 'HH24:MI')  AS hora_inicio,
   TO_CHAR(al.HORA_TERMINO, 'HH24:MI') AS hora_fim,

   aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento_aula,
   est.DESIGNACAO AS estado_agendamento_aula_designacao,

   h.DESIGNACAO AS horario,
   au.DESIGNACAO AS sala,
   cl.DESIGNACAO AS classe,
   m.DESIGNACAO AS modalidade,
   ds.DESIGNACAO AS dia_semana,

   JSON_VALUE(al.REF_DOCENTE, '$.nome') AS docente

FROM FK2_MSA_TB_SUMARIO s

INNER JOIN FK2_MSA_TB_AGENDAMENTO_AULA aa
  ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA

INNER JOIN FK2_MGH_TB_AULA al
  ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA

INNER JOIN FK2_MGD_TB_DOCENTE d2
  ON JSON_VALUE(aa.REF_AULA, '$.pkDocente') = d2.CODIGO

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

LEFT JOIN FK2_TB_ESTADO_SUMARIO es
  ON s.FK_ESTADO_SUMARIO = es.CODIGO

${whereClause}

ORDER BY s.PK_TB_SUMARIO ASC
OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
`;

  const sqlParams = { ...whereParams, offset, limit };

  const countSql = `
SELECT COUNT(DISTINCT s.PK_TB_SUMARIO) as total
FROM FK2_MSA_TB_SUMARIO s
INNER JOIN FK2_MSA_TB_AGENDAMENTO_AULA aa
  ON s.FK_AGENDAMENTO_AULA = aa.PK_AGENDAMENTO_AULA
INNER JOIN FK2_MGH_TB_AULA al
  ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
INNER JOIN FK2_MGH_TB_HORARIO h
  ON al.FK_HORARIO = h.PK_HORARIO
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
    console.error('Erro ao buscar sumários:', error);
    throw new Error(`Falha ao consultar sumários: ${error.message}`);
  }
}
async validarSumario(estado: number, codigo: number) {
  if (estado === undefined) {
    throw new ConflictException('Estado do sumário é obrigatório');
  }

  // 1️⃣ Buscar o sumário
  const sumario = await this.dataSource.query(
    `SELECT * FROM FK2_MSA_TB_SUMARIO WHERE PK_TB_SUMARIO = :codigo`,
    { codigo } as any
  );

  if (!sumario || sumario.length === 0) {
    throw new NotFoundException('Sumário não encontrado');
  }

  const aulaId = sumario[0].FK_AGENDAMENTO_AULA;

  // 2️⃣ Buscar a aula relacionada
  const aula = await this.dataSource.query(
    `SELECT * FROM FK2_MSA_TB_AGENDAMENTO_AULA WHERE PK_AGENDAMENTO_AULA = :aulaId`,
    { aulaId } as any
  );

  if (!aula || aula.length === 0) {
    throw new NotFoundException('Aula relacionada ao sumário não encontrada');
  }

  // 3️⃣ Verificar se o sumarista já validou a aula
  const aulaValidada = aula[0].FK_ESTADO_AGENDAMENTO === 3;

  let podeValidar = aulaValidada;

  // 4️⃣ Checar tabela de parâmetros se permite validar sem aula validada
if (!podeValidar) {
  const param = await this.dataSource.query(
    `SELECT ARGS AS valor FROM FK2_MSA_TB_PARAMETRO WHERE SIGLA = 'pvssms'`
  );

  if (Array.isArray(param) && param.length > 0) {
    const valorJson = JSON.parse(param[0].VALOR);
    if (valorJson.valor === true) {
      podeValidar = true;
    }
  }
}
  if (!podeValidar) {
    throw new ConflictException(
      'Não é possível validar o sumário porque a aula ainda não foi validada'
    );
  }

 
  const updateSql = `
    UPDATE FK2_MSA_TB_SUMARIO
    SET FK_ESTADO_SUMARIO = :fk_estado_sumario,
        UPDATED_AT = SYSDATE
    WHERE PK_TB_SUMARIO = :codigo
  `;
  const params = { fk_estado_sumario: estado, codigo };

  try {
    await this.dataSource.query(updateSql, params as any);
    return { success: true, message: 'Sumário atualizado com sucesso' };
  } catch (error) {
    console.error('Erro ao atualizar sumário:', error);
    throw new Error(`Falha ao atualizar sumário: ${error.message}`);
  }
}
}