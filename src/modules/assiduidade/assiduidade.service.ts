import { BadGatewayException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindAttendanceTestDto } from './dto/FindAttendanceTestDto';
import { MarkAttendanceDto } from './dto/MarkAttendanceDto';

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
    // TODO: vou tirar essa logica de grupos e vou deixar o endpoint aberto para todos os utilizadores, porque a informação que ele retorna é apenas de leitura e não tem nada de sensível, e isso vai facilitar os testes e o desenvolvimento do frontend. Depois, se for necessário, posso adicionar uma camada de autorização mais específica. por permissões ou algo do tipo.
    return await this.classScheduling(dto);

  }
  assiduidadeCampo(dto: FindAgendamentoAulaDto) {
    return this.attendanceTrip(dto)
  }
  // MARCAR ASSIDUIDADE  DA AULA (NORMAL/CAMPO)
  async markAttendance(dto: MarkAttendanceDto
  ): Promise<{ message: string }> {

    const sql = `
    UPDATE FK2_MSA_TB_AGENDAMENTO_AULA
    SET 
      FK_ESTADO_AGENDAMENTO = :novoEstado,
      UPDATED_AT = SYSDATE
    WHERE PK_AGENDAMENTO_AULA = :codigoAgendamento
  `;

    try {
      await this.dataSource.query(sql, {
        codigoAgendamento: dto.codigoAgendamento,
        novoEstado: dto.novoEstado,
      } as any);
      return { message: 'Estado do agendamento atualizado com sucesso.' };
    } catch (error) {
      console.error('Erro ao atualizar estado do agendamento:', error);
      throw new Error('Falha ao atualizar estado do agendamento.');
    }
  }
  async markAttendanceTest(dto: MarkAttendanceDto): Promise<{ message: string }> {


    const sql = `
    UPDATE FK2_TB_CALENDARIO_PROVA_VIGILANTE
    SET 
      ESTADO_AGENDAMENTO = :novoEstado
     
    WHERE CODIGO = :codigoAgendamento
  `;

    try {
      await this.dataSource.query(sql, {
        codigoAgendamento: dto.codigoAgendamento,
        novoEstado: dto.novoEstado,
      } as any);
      return { message: 'Estado do agendamento de prova atualizado com sucesso.' };
    } catch (error) {
      console.error('Erro ao atualizar estado do agendamento de prova:', error);
      throw new Error('Falha ao atualizar estado do agendamento de prova.');
    }
  }

   async assiduidadeProva(dto: FindAttendanceTestDto) {
    return this.attendanceTest(dto);
  }
   async getAllStatusAgendamento() {
    const sql = `
    SELECT PK_ESTADO_AGENDAMENTO AS codigo, DESIGNACAO AS designacao  FROM FK2_MSA_TB_ESTADO_AGENDAMENTO`;

    const status = await this.dataSource.query(sql);
    return toLowerCaseKeys(status);
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
   

    return result[0]?.TOTAL > 0;
  }
  // Assiduidade da aula
  private async classScheduling(dto: FindAgendamentoAulaDto) {
    const {
      docente = 0,
      unidadeCurricular = 0,
      dataInicial,
      dataFinal,
      estado= 0,
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
   ds.DESIGNACAO AS dia_semana,


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
  private async classSchedulingsecond(dto: FindAgendamentoAulaDto) {
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
   c2.DESIGNACAO AS curso,
   d.DESIGNACAO AS unidade_curricular,
   at.DESIGNACAO  AS tipo_aula,
   al.ORDEM AS ordem_tempo,
   al.HORA_INICIO AS hora_inicio,
   al.HORA_TERMINO AS hora_fim,
   aa.DATA_AULA AS data_aula,
   aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento_aula,
   est.DESIGNACAO AS estado_agendamento_aula_designacao,
   ds.DESIGNACAO AS dia_semana,


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
  private async classSchedulingThird(dto: FindAgendamentoAulaDto) {
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
   ds.DESIGNACAO AS dia_semana,

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
  // Assiduidade de campo
  private async attendanceTrip(dto: FindAgendamentoAulaDto) {
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
    const tipoAulaSigla = 'adc';

    if (docente !== 0) whereParams.docente = docente;

    if (unidadeCurricular !== 0) whereParams.unidadeCurricular = unidadeCurricular;

    if (estado !== 0) whereParams.estado = estado;
    if (semestre !== 0) whereParams.semestre = semestre;
    if (tipoAulaSigla) {
      whereParams.tipoAulaSigla = tipoAulaSigla;
    }


    if (anoLectivo !== 0) whereParams.anoLectivo = anoLectivo;

    // Monta as condições dinamicamente

    const conditions: string[] = [
      'aa.ACTIVE_STATE = 1',

      'aa.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
      'at.SIGLA =:tipoAulaSigla',
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
  TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD')     AS data_aula,
TO_CHAR(al.HORA_INICIO, 'HH24:MI')      AS hora_inicio,
TO_CHAR(al.HORA_TERMINO, 'HH24:MI')     AS hora_fim,
   aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento_aula,
   est.DESIGNACAO AS estado_agendamento_aula_designacao,
   ds.DESIGNACAO AS dia_semana,


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
  ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO
INNER JOIN FK2_MGH_TB_HORARIO h
  ON al.FK_HORARIO = h.PK_HORARIO
INNER JOIN FK2_MGH_TB_TIPO_AULA at
  ON at.PK_TIPO_AULA = al.FK_TIPO_AULA
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


  // Assiduidade da prova

  private async attendanceTest(dto: FindAttendanceTestDto) {
    const {
      docente = 0,
      disciplina = 0,
      estado = 0,
      anoLectivo = 0,
      semestre = 0,
      dataInicio,
      dataFim,
      page = 1,
      limit = 20,
    } = dto;

    const offset = (page - 1) * limit;

    const whereParams: Record<string, any> = {
      dataInicio,
      dataFim,
    };
  

    if (docente !== 0) whereParams.docente = docente;
    if (disciplina !== 0) whereParams.disciplina = disciplina;
    if (estado !== 0) whereParams.estado = estado;
    if (anoLectivo !== 0) whereParams.anoLectivo = anoLectivo;
    if (semestre !== 0) whereParams.semestre = semestre;

    // Condições base
    const conditions: string[] = [
      'cp.DATA_PROVA BETWEEN :dataInicio AND :dataFim',
    ];

    if (docente !== 0) {
      conditions.push(
        "JSON_VALUE(v.REF_VIGILANTE, '$.pk' RETURNING NUMBER) = :docente"
      );
    }

    if (anoLectivo !== 0) {
      conditions.push(
        "JSON_VALUE(cp.REF_PRAZO, '$.pk_anoLectivo' RETURNING NUMBER) = :anoLectivo"
      );
    }

    if (semestre !== 0) {
      conditions.push(
        "JSON_VALUE(cp.REF_PRAZO, '$.pk_semestre' RETURNING NUMBER) = :semestre"
      );
    }

    if (disciplina !== 0) {
      conditions.push('d.CODIGO = :disciplina');
    }

    if (estado !== 0) {
      conditions.push('ap.PK_ESTADO_AGENDAMENTO = :estado');
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
 
    const sql = `
    SELECT DISTINCT
      v.CODIGO,
    
      TO_CHAR(cp.DATA_PROVA, 'YYYY-MM-DD') AS data_prova,
      d.DESIGNACAO AS disciplina,
      ap.DESIGNACAO AS estado,
      v.ESTADO_AGENDAMENTO AS estado_agendamentoId,
       JSON_VALUE(cp.REF_PRAZO, '$.pk_anoLectivo') AS ano_lectivo,
       al.DESIGNACAO AS ano_lectivo_designacao,
      JSON_VALUE(cp.REF_PRAZO, '$.pk_semestre') AS semestre,
      TO_CHAR(cp.HORA_PROVA, 'HH24:MI') AS hora_prova,
        TO_CHAR(cp.HORA_TERMINO, 'HH24:MI') AS hora_termino,
        TO_CHAR(cp.DURACAOPROVA, 'HH24:MI') AS duracao_prova,
     
      
      JSON_VALUE(v.REF_VIGILANTE, '$.desc') AS docente_nome
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE v
    LEFT JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO ap
      ON ap.PK_ESTADO_AGENDAMENTO = v.ESTADO_AGENDAMENTO
    LEFT JOIN FK2_TB_CALENDARIO_PROVA cp
      ON cp.CODIGO = v.CALENDARIO_PROVA
    LEFT JOIN FK2_TB_DISCIPLINAS d
      ON d.CODIGO = cp.CODIGO_DISCIPLINA
      LEFT JOIN FK2_TB_ANO_LECTIVO al
      ON JSON_VALUE(cp.REF_PRAZO, '$.pk_anoLectivo' RETURNING NUMBER) = al.CODIGO
    
    ${whereClause}
    ORDER BY cp.DATA_PROVA ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = { ...whereParams, offset, limit };

    const countSql = `
    SELECT COUNT(DISTINCT v.CODIGO) AS total
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE v
    LEFT JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO ap
      ON ap.PK_ESTADO_AGENDAMENTO = v.ESTADO_AGENDAMENTO
    LEFT JOIN FK2_TB_CALENDARIO_PROVA cp
      ON cp.CODIGO = v.CALENDARIO_PROVA
    LEFT JOIN FK2_DISCIPLINA d
      ON d.CODIGO = cp.CODIGO_DISCIPLINA
        LEFT JOIN FK2_TB_ANO_LECTIVO al
      ON JSON_VALUE(cp.REF_PRAZO, '$.pk_anoLectivo' RETURNING NUMBER) = al.CODIGO
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
      console.error('Erro ao buscar assiduidade da prova:', error);
      throw new Error(`Falha ao consultar assiduidade: ${error.message}`);
    }
  }



}
