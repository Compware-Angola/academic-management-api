import { BadGatewayException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { AtendanceControlling } from './dto/attendance-controlling.dto';
import { FindAttendanceTestDto } from './dto/FindAttendanceTestDto';
import { MarkAttendanceDto } from './dto/MarkAttendanceDto';
import { GeneralAttendanceCalendarDto } from './dto/GeneralAttendanceCalendarDto';
import { addDays, parseISODateOrToday, startOfMonth, startOfNextMonth, startOfWeekMonday, toISODate } from '../common/helpers/parseISODateOrToday';
import { FindTeacherClassCalendarDto } from './dto/FindTeacherClassCalendarDto';

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

async attendanceControlling(dto: AtendanceControlling) {
  const {
    docente = 0,
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

  const conditions: string[] = [
    'aa.ACTIVE_STATE = 1',
    'aa.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
    'h.ACTIVE_STATE = 1',
  ];

  // Docente
  if (docente !== 0) {
    conditions.push('aa.FK_DOCENTE = :docente');
    whereParams.docente = docente;
  }

  // Estado
  if (estado !== 0) {
    conditions.push('aa.FK_ESTADO_AGENDAMENTO = :estado');
    whereParams.estado = estado;
  }

  // Ano Lectivo
  if (anoLectivo !== 0) {
    conditions.push('h.FK_ANO_LECTIVO = :anoLectivo');
    whereParams.anoLectivo = anoLectivo;
  }

  // Semestre
  if (semestre !== 0) {
    conditions.push('gc.CODIGO_SEMESTRE = :semestre');
    whereParams.semestre = semestre;
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      aa.PK_AGENDAMENTO_AULA AS codigo,
      c2.DESIGNACAO AS curso,
      d.DESIGNACAO AS unidade_curricular,
      al.ORDEM AS ordem_tempo,
      TO_CHAR(al.HORA_INICIO, 'HH24:MI')  AS hora_inicio,
      TO_CHAR(al.HORA_TERMINO, 'HH24:MI') AS hora_fim,
      TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD') AS data_aula,
      aa.FK_ESTADO_AGENDAMENTO AS estado_agendamento,
      est.DESIGNACAO AS estado_agendamento_designacao,
      JSON_VALUE(al.REF_DOCENTE, '$.nome') AS docente
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON TO_NUMBER(aa.FK_AULA) = al.PK_AULA
    INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
    INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc
      ON TO_NUMBER(aa.FK_GRADE_CURRICULAR) = gc.CODIGO
    LEFT JOIN FK2_TB_DISCIPLINAS d
      ON gc.CODIGO_DISCIPLINA = d.CODIGO
    LEFT JOIN FK2_TB_CURSOS c2
      ON gc.CODIGO_CURSO = c2.CODIGO
    ${whereClause}
    ORDER BY aa.DATA_AULA ASC
    OFFSET :offset ROWS
    FETCH NEXT :limit ROWS ONLY
  `;

  const sqlParams = { ...whereParams, offset, limit };

  const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON TO_NUMBER(aa.FK_AULA) = al.PK_AULA
    INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
    INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc
      ON TO_NUMBER(aa.FK_GRADE_CURRICULAR) = gc.CODIGO
    ${whereClause}
  `;

  const summarySql = `
    SELECT
      SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS marcacoes_pendentes,
      SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS faltas_marcadas,
      SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS presencas_marcadas
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON TO_NUMBER(aa.FK_AULA) = al.PK_AULA
    INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
    INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc
      ON TO_NUMBER(aa.FK_GRADE_CURRICULAR) = gc.CODIGO
    ${whereClause}
  `;

  try {
    const [records, countResult, summaryResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams as any),
      this.dataSource.query(countSql, whereParams as any),
      this.dataSource.query(summarySql, whereParams as any),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    const resumo = {
      marcacoesPendentes: Number(summaryResult?.[0]?.MARCACOES_PENDENTES ?? 0),
      faltasMarcadas: Number(summaryResult?.[0]?.FALTAS_MARCADAS ?? 0),
      presencasMarcadas: Number(summaryResult?.[0]?.PRESENCAS_MARCADAS ?? 0),
    };

    return {
      data: toLowerCaseKeys(records),
      resumo,
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    throw new Error(`Falha ao consultar agendamentos: ${error.message}`);
  }
}

async getStateLessonAttendance(): Promise<[]> {
  const result = await this.dataSource.query(
    `
      SELECT DESIGNACAO, PK_ESTADO_AGENDAMENTO
      FROM FK2_MSA_TB_ESTADO_AGENDAMENTO
    `
  );

  return result;
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
    console.log(dataInicio);


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
     
      
      JSON_VALUE(v.REF_VIGILANTE, '$.nome') AS docente_nome
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


  async generalAttendanceByDocenteCalendar(dto: GeneralAttendanceCalendarDto) {
    
  const docenteIdNum = dto.docenteId ? Number(dto.docenteId) : 0;
  const {docenteNome = '', modo } = dto;
  const refDate = parseISODateOrToday(dto.dataReferencia);

  if (!modo) {
    throw new BadGatewayException('Parâmetro "modo" é obrigatório: MES | SEMANA | DIA');
  }

  // Intervalos (inicio inclusivo, fim exclusivo)
  let inicio: Date;
  let fim: Date;

  if (modo === 'MES') {
    inicio = startOfMonth(refDate);
    fim = startOfNextMonth(refDate);
  } else if (modo === 'SEMANA') {
    inicio = startOfWeekMonday(refDate);
    fim = addDays(inicio, 7);
  } else {
    // DIA
    inicio = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    fim = addDays(inicio, 1);
  }

  // ✅ filtro docente: preferir docenteId (FK_DOCENTE); se não vier, usa docenteNome via JSON_VALUE
  const conditions: string[] = [
    'aa.ACTIVE_STATE = 1',
    'aa.FK_ESTADO_AGENDAMENTO IN (1,2,3)',
    'aa.DATA_AULA >= :inicio AND aa.DATA_AULA < :fim',
  ];

  const params: Record<string, any> = {
    inicio,
    fim,
  };

  // Se vier docenteId, filtra por FK_DOCENTE
  if (docenteIdNum && docenteIdNum !== 0) {
    conditions.push('aa.FK_DOCENTE = :docenteId');
    params.docenteId = docenteIdNum;
  } else if (docenteNome && docenteNome.trim().length > 0) {
    // Compatível com o legado (nome do docente)
    conditions.push(`JSON_VALUE(al.REF_DOCENTE, '$.nome') = :docenteNome`);
    params.docenteNome = docenteNome.trim();
  } else {
    throw new BadGatewayException('Informe "docenteId" ou "docenteNome".');
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // =========================
  // MODO MÊS (agregado por dia)
  // =========================
  if (modo === 'MES') {
    const sql = `
      SELECT
        TO_CHAR(TRUNC(aa.DATA_AULA), 'YYYY-MM-DD') AS dia,
        COUNT(*) AS total_aulas,
        SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS faltas,
        SUM(CASE WHEN aa.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS presencas
      FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
      JOIN FK2_MGH_TB_AULA al
        ON TO_NUMBER(aa.FK_AULA) = al.PK_AULA
      ${whereClause}
      GROUP BY TRUNC(aa.DATA_AULA)
      ORDER BY TRUNC(aa.DATA_AULA)
    `;

    const rows = await this.dataSource.query(sql, params as any);
    // Opcional: já devolve um "statusDoDia" para facilitar o frontend pintar
    const data = toLowerCaseKeys(rows).map((r: any) => {
      const pend = Number(r.pendentes || 0);
      const falt = Number(r.faltas || 0);
      const pres = Number(r.presencas || 0);

      let statusDoDia: 'FALTA' | 'PENDENTE' | 'PRESENCA' | 'SEM_DADOS' = 'SEM_DADOS';
      if (falt > 0) statusDoDia = 'FALTA';
      else if (pend > 0) statusDoDia = 'PENDENTE';
      else if (pres > 0) statusDoDia = 'PRESENCA';

      return { ...r, statusDoDia };
    });

    return {
      modo,
      intervalo: { inicio: toISODate(inicio), fim: toISODate(addDays(fim, -1)) }, // fim "humano"
      data,
    };
  }

  // =====================================
  // MODO SEMANA/DIA (lista de eventos)
  // =====================================
  const sql = `
    SELECT
      aa.PK_AGENDAMENTO_AULA AS codigo,
      TO_CHAR(TRUNC(aa.DATA_AULA), 'YYYY-MM-DD') AS dia,
      TO_CHAR(al.HORA_INICIO, 'HH24:MI') AS hora_inicio,
      TO_CHAR(al.HORA_TERMINO, 'HH24:MI') AS hora_fim,
      aa.FK_ESTADO_AGENDAMENTO AS estado,
      al.ORDEM AS ordem_tempo
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    JOIN FK2_MGH_TB_AULA al
      ON TO_NUMBER(aa.FK_AULA) = al.PK_AULA
    ${whereClause}
    ORDER BY TRUNC(aa.DATA_AULA), al.HORA_INICIO
  `;

    const rows = await this.dataSource.query(sql, params as any);

      return {
        modo,
        intervalo: { inicio: toISODate(inicio), fim: toISODate(addDays(fim, -1)) },
        data: toLowerCaseKeys(rows),
      };
    }

    async teacherClassCalendar(dto: FindTeacherClassCalendarDto) {
  const docente = Number(dto.docente);
  const dataInicial = dto.dataInicial ?? '2000-01-01';
  const dataFinal = dto.dataFinal ?? '2100-12-31';

  const sql = `
    SELECT
      aa.PK_AGENDAMENTO_AULA AS codigo,
      TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD') AS data_aula,
      TO_CHAR(al.HORA_INICIO, 'HH24:MI') AS hora_inicio,
      TO_CHAR(al.HORA_TERMINO, 'HH24:MI') AS hora_fim,
      aa.FK_ESTADO_AGENDAMENTO AS estado,
      est.DESIGNACAO AS estado_designacao,
      JSON_VALUE(aa.REF_AULA, '$.designacaoGrade') AS disciplina,
      JSON_VALUE(al.REF_DOCENTE, '$.nome') AS docente,
      JSON_VALUE(al.REF_SALA, '$.desc') AS sala,
      ta.DESIGNACAO AS tipo_aula,
      m.DESIGNACAO AS modalidade
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MGH_TB_AULA al
      ON JSON_VALUE(aa.REF_AULA, '$.pkAula' RETURNING NUMBER) = al.PK_AULA
    INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO est
      ON aa.FK_ESTADO_AGENDAMENTO = est.PK_ESTADO_AGENDAMENTO
    INNER JOIN FK2_MGH_TB_HORARIO h
      ON al.FK_HORARIO = h.PK_HORARIO
    LEFT JOIN FK2_MGH_TB_TIPO_AULA ta
      ON al.FK_TIPO_AULA = ta.PK_TIPO_AULA
    LEFT JOIN FK2_MGH_TB_MODALIDADE m
      ON al.FK_MODALIDADE = m.PK_MODALIDADE
    WHERE aa.ACTIVE_STATE = 1
      AND JSON_VALUE(aa.REF_AULA, '$.pkDocente' RETURNING NUMBER) = :docente
      AND aa.DATA_AULA BETWEEN TO_DATE(:dataInicial, 'YYYY-MM-DD') AND TO_DATE(:dataFinal, 'YYYY-MM-DD')
      AND h.FK_ESTADO_HORARIO_WF <> 4
    ORDER BY aa.DATA_AULA ASC, al.HORA_INICIO ASC
  `;

  try {
    const rows = await this.dataSource.query(sql, {
      docente,
      dataInicial,
      dataFinal,
    } as any);

    const data = toLowerCaseKeys(rows).map((item: any) => ({
      ...item,
      start: `${item.data_aula}T${item.hora_inicio}:00`,
      end: `${item.data_aula}T${item.hora_fim}:00`,
      cor:
        Number(item.estado) === 1
          ? '#ffca38'
          : Number(item.estado) === 2
          ? '#ff9999'
          : Number(item.estado) === 3
          ? '#99ff99'
          : '#ffca38',
    }));

    return {
      data,
      resumo: {
        totalEventos: data.length,
        pendentes: data.filter((item: any) => Number(item.estado) === 1).length,
        faltas: data.filter((item: any) => Number(item.estado) === 2).length,
        presencas: data.filter((item: any) => Number(item.estado) === 3).length,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar calendário de aulas do docente:', error);
    throw new Error(`Falha ao consultar calendário de aulas: ${error.message}`);
  }
}

}
