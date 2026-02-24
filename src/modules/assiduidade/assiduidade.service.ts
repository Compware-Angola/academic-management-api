import { BadGatewayException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class AssiduidadeService {
  constructor(private readonly dataSource: DataSource) { }
  async assiduidade(utilizadorId: number, dto: FindAgendamentoAulaDto) {
    // Verifica pelos grupos
    // grupo com id 1 - Administrador
    // grupo com id 2 - DTI
    // grupo com id 7 - Sumarista
    // grupo com id 13 - Decanos/Faculdades
    // grupo com id 17 - Reitoria
    //

    if (await this.checkgroupuser(utilizadorId, 1) || await this.checkgroupuser(utilizadorId, 2)) {
      return await this.classScheduling(dto);
    }

    if (await this.checkgroupuser(utilizadorId, 7)) {
      return await this.classSchedulingsecond(dto);
    }

    if (await this.checkgroupuser(utilizadorId, 13)) {
      return await this.classSchedulingThird(dto);
    }

    if (await this.checkgroupuser(utilizadorId, 17)) {
      return await this.classScheduling(dto);
    }

    return await this.classScheduling(dto);

  }

  assiduidadeProva() {
    return `This action returns all assiduidade`;
  }
  assiduidadeCampo() {
    return `This action returns all assiduidade`;
  }


  private async checkgroupuser(
    utilizadorId: number,
    groupId: number
  ): Promise<boolean> {
    const result = await this.dataSource.query(
      `
    SELECT COUNT(1) AS total
    FROM FK2_MCA_TB_GRUPO_UTILIZADOR gu
    WHERE gu.FK_GRUPO = :groupId
      AND gu.FK_UTILIZADOR = :utilizadorId
      AND gu.ACTIVE_STATE = 1
    `,
      { groupId, utilizadorId } as any
    );
    console.log(result);

    return result[0]?.TOTAL > 0;
  }

  async classScheduling(dto: FindAgendamentoAulaDto) {
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
   al.HORA_INICIO AS hora_inicio,
   al.HORA_TERMINO AS hora_fim,
   aa.DATA_AULA AS data_aula,
   aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento_aula,
   est.DESIGNACAO AS estado_agendamento_aula_designacao,

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

${whereClause}

ORDER BY aa.DATA_AULA ASC
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
  async classSchedulingsecond(dto: FindAgendamentoAulaDto) {
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
      'al.FK_TIPO_AULA IN (1,2,3,5)'
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
     JSON_VALUE(al.REF_DOCENTE, '$.nome') AS Docente,
     

    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO =est.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR gc
      ON aa.FK_GRADE_CURRICULAR=gc.CODIGO
       ON  json_value(al.REF_SALA, '$.pk') =au. CODIGO
        INNER JOIN FK2_MGH_TB_TIPO_AULA at
                ON at.PK_TIPO_AULA = al.FK_TIPO_AULA
        INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA ds
                ON ds.PK_DIA_DA_SEMANA = al.FK_DIA_DA_SEMANA
        INNER JOIN FK2_MGH_TB_MODALIDADE m
                ON m.PK_MODALIDADE = al.FK_MODALIDADE
        INNER JOIN FK2_TB_GRADE_CURRICULAR c
                ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
        LEFT JOIN FK2_TB_DISCIPLINAS d
                ON c.CODIGO_DISCIPLINA = d.CODIGO
        LEFT JOIN FK2_TB_CURSOS c2
                ON c.CODIGO_CURSO = c2.CODIGO
        LEFT JOIN FK2_TB_CLASSES cl
                ON c.CODIGO_CLASSE = cl.CODIGO
    ${whereClause}
    ORDER BY aa.DATA_AULA ASC
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
  async classSchedulingThird(dto: FindAgendamentoAulaDto) {
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
      'h.FK_ESTADO_HORARIO_WF !=4',
      'h.ACTIVE_STATE= 1'
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

    if (anoLectivo !== 0) {
      conditions.push("h.FK_ANO_LECTIVO = :anoLectivo");
    }

    if (semestre !== 0) {
      conditions.push("h.FK_SEMESTRE = :semestre");
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
    SELECT *
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO =est.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
    ${whereClause}
    ORDER BY aa.DATA_AULA ASC
    OFFSET :offset ROWS
    FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = { ...whereParams, offset, limit };


    const countSql = `
    SELECT COUNT( aa.PK_AGENDAMENTO_AULA) as total
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO =est.PK_ESTADO_AGENDAMENTO
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
      console.error('Erro ao buscar agendamentos de al:', error);
      throw new Error(`Falha ao consultar agendamentos: ${error.message}`);
    }
  }
}
