import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { DataSource } from 'typeorm';
import oracledb from 'oracledb';
import { ListScheduleDto } from './dto/list-schedule.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListScheduleUCDto } from './dto/list-schedule-uc.dto';
import { CreatePermissionEditScheduleDto } from './dto/create-permission-edit-schedule.dto';
import { ListScheduleDocenteDto } from './dto/list-schedule-docente.dto';
import { MoveStudentsToScheduleDto } from './dto/move-students-to-schedule.dto';
import { escapeQuotes } from '../util/escape-quotes';
import { ListScheduleDayOfWeekto } from './dto/list-schedule-day-of-week.dto';
import { ListScheduleClassRoomDto } from './dto/list-schedule-class-room.dto';
import { FindScheduleByDesignationDto } from './dto/find-schedule-by-designation.dto';
import { ListScheduleWithPermissionDto } from './dto/list-schedule-with-permission.dto';
import { UpdatePermissionEditScheduleDto } from './dto/update-permission-edit-schedule.dto';

// deletar passar para estaso 0 e as aulas que estao com este hotario mudar oestado tbm para 0
// Validar horario
// Disponibilidade  1-diponivel 0-indisponivel
@Injectable()
export class ScheduleService {
  constructor(private readonly dataSource: DataSource) {}
  async create(userId: number, dto: CreateScheduleDto) {
    const terms = await this.promptToCreateAndEditSchedule(5, dto.anoLectivo);
    if (!terms) {
      throw new BadRequestException(
        'O prazo de criação Ainda Não foi  definido.',
      );
    }

    const agora = new Date();
    const dataInicio = new Date(terms.DATA_INICIO);
    const dataFim = new Date(terms.DATA_FIM);

    const estaNoPrazo =
      agora.getTime() >= dataInicio.getTime() &&
      agora.getTime() <= dataFim.getTime();

    if (!estaNoPrazo) {
      throw new BadRequestException(
        'O prazo de criação de Horário já terminou .',
      );
    }

    return await this.createOrUpdateHorario(userId, dto);
  }

  async update(userId: number, horarioIdParam: number, dto: UpdateScheduleDto) {
    let dataInicioLoophole;
    let dataFimLoophole;

    let dataInicio;
    let dataFim;

    let estaNoPrazo;

    let loopholeToEdit;
    const agora = new Date();

    const terms = await this.promptToCreateAndEditSchedule(5, dto.anoLectivo);
    if (!terms) {
      throw new BadRequestException(
        'O prazo de criação Ainda Não foi  definido.',
      );
    }
    if (terms) {
      dataInicio = new Date(terms.DATA_INICIO);
      dataFim = new Date(terms.DATA_FIM);
      estaNoPrazo =
        agora.getTime() >= dataInicio.getTime() &&
        agora.getTime() <= dataFim.getTime();
    }

    // Brecha
    const loopholeToEditSchedule =
      await this.loopholeToEditSchedule(horarioIdParam);
    if (!estaNoPrazo && !loopholeToEditSchedule) {
      throw new BadRequestException(
        'Este Horário não tem permissão de ser Editado .',
      );
    }
    if (loopholeToEditSchedule) {
      dataInicioLoophole = new Date(loopholeToEditSchedule.DATA_INICIO);
      dataFimLoophole = new Date(loopholeToEditSchedule.DATA_FIM);
      loopholeToEdit =
        agora.getTime() >= dataInicioLoophole.getTime() &&
        agora.getTime() <= dataFimLoophole.getTime();
    }

    if (!estaNoPrazo && !loopholeToEdit) {
      throw new BadRequestException(
        'O prazo de Edição de Horário já terminou .',
      );
    }
    return await this.createOrUpdateHorario(userId, dto, horarioIdParam);
  }

  async delete(userId: number, horarioId: number) {
    const result = await this.dataSource.query(
      `
    SELECT "PK_HORARIO", "DESIGNACAO", "DIPONIVEL"
    FROM "FK2_MGH_TB_HORARIO"
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      [horarioId],
    );

    const horario = result[0];
    if (!result || result.length === 0) {
      throw new NotFoundException(
        `Horário com ID ${horarioId} não encontrado ou inativo`,
      );
    }
    await this.dataSource.query(
      `
    UPDATE "FK2_MGH_TB_HORARIO"
    SET
      "ACTIVE_STATE" = 0,
      "UPDATED_AT" = SYSDATE,
      "LAST_UPDATED_BY" = :userId
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      { userId, horarioId } as any,
    );

    return {
      message: `Horário "${horario.DESIGNACAO}" foi excluído com sucesso (soft delete)`,
      horarioId,
      excluidoPor: userId,
      dataExclusao: new Date().toISOString(),
    };
  }

  async createPermissionToEditSchedule(query: CreatePermissionEditScheduleDto) {
    const json_user = `{"pk": ${query.userId}, "desc": " ", "corLetra": "black", "disponivel": true}`;

    const agora = new Date();
    const dataInicio = new Date(query.dataInicio);
    const dataFim = new Date(query.dataFim);
    const interval =
      agora.getTime() >= dataInicio.getTime() &&
      agora.getTime() <= dataFim.getTime();

    if (!interval) {
      throw new BadRequestException(
        `Não podes criar uma Permissão Com estes intervalo de Data Vencida: ${query.dataInicio} - ${query.dataFim}`,
      );
    }
    const result = await this.dataSource.query(
      `
    INSERT INTO FK2_MGH_TB_PERMISAO_EDICAO_HORARIO (
      FK_HORARIO,
      RE_UTILIZADOR,
      DATA_INICIO,
      DATA_FIM,
      ATIVE_STATE
    ) VALUES (
      :horario,
      :refUser,
      TO_DATE(:dataInicio, 'YYYY-MM-DD'),
      TO_DATE(:dataFim, 'YYYY-MM-DD'),
      1
     ) RETURNING PK_PERMISAO_EDICAO_HORARIO INTO :outId
    `,
      {
        horario: query.fkHorario,
        refUser: json_user,
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );
    //pegar o Id
    const permissionId = result.outId[0];
    return {
      message: 'Permissão Adicionada com sucesso',
      permissionId,
    };
  }

  async updatePermissionToEditSchedule(
    permissionId: number,
    query: UpdatePermissionEditScheduleDto,
  ) {
    const fields: string[] = [];
    const params: any = { permissionId };

    

    if (query.dataInicio && query.dataFim) {
      const agora = new Date();
      const inicio = new Date(query.dataInicio);
      const fim = new Date(query.dataFim);

      const interval =
        agora.getTime() >= inicio.getTime() && agora.getTime() <= fim.getTime();

      if (!interval) {
        throw new BadRequestException(
          `Não podes editar a permissão com intervalo vencido: ${query.dataInicio} - ${query.dataFim}`,
        );
      }

      params.dataInicio = query.dataInicio;
      params.dataFim = query.dataFim;

      fields.push(`DATA_INICIO = TO_DATE(:dataInicio, 'YYYY-MM-DD')`);
      fields.push(`DATA_FIM = TO_DATE(:dataFim, 'YYYY-MM-DD')`);
    }

    if (query.ativeState !== undefined) {
      if (![0, 1].includes(query.ativeState)) {
        throw new BadRequestException('ATIVE_STATE deve ser 0 ou 1');
      }

      params.ativeState = query.ativeState;
      fields.push(`ATIVE_STATE = :ativeState`);
    }
  
    

    if (fields.length === 0) {
      throw new BadRequestException(
        'Nenhum dado foi fornecido para atualização',
      );
    }

    const sql = `
    UPDATE FK2_MGH_TB_PERMISAO_EDICAO_HORARIO
       SET ${fields.join(', ')}
     WHERE PK_PERMISAO_EDICAO_HORARIO = :permissionId
     RETURNING PK_PERMISAO_EDICAO_HORARIO INTO :outId
  `;
  console.log(params,sql,fields);
    const result = await this.dataSource.query(sql, {
      ...params,
      outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    } as any);

    return {
      message: 'Permissão atualizada com sucesso',
      permissionId: result.outId[0],
    };
  }

  async restore(userId: number, horarioId: number) {
    // 1. Verifica se o horário está inativo (ACTIVE_STATE = 0)
    const result = await this.dataSource.query(
      `
    SELECT "PK_HORARIO", "DESIGNACAO"
    FROM "FK2_MGH_TB_HORARIO"
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 0
  `,
      [horarioId],
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `Horário ${horarioId} não está excluído ou não existe`,
      );
    }

    const horario = result[0];

    // 2. Reativa o horário
    await this.dataSource.query(
      `
    UPDATE "FK2_MGH_TB_HORARIO"
    SET
      "ACTIVE_STATE" = 1,
      "UPDATED_AT" = SYSDATE,
      "LAST_UPDATED_BY" = :userId
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 0
  `,
      { userId, horarioId } as any,
    );

    return {
      message: `Horário "${horario.DESIGNACAO}" foi restaurado com sucesso`,
      horarioId,
      restauradoPor: userId,
      dataRestauracao: new Date().toISOString(),
    };
  }
  async findSchedulesByAnoPeriodoGrade(
    anoLectivo: number,
    periodo: number,
    gradeCurricular: number,
  ) {
    if (!anoLectivo || !periodo || !gradeCurricular) {
      throw new BadRequestException('Parâmetros de filtro inválidos');
    }

    const result = await this.dataSource.query(
      `
    SELECT
      h.PK_HORARIO                                          AS CODIGO,
      anl.DESIGNACAO                                        AS ANO_LECTIVO,
      DBMS_LOB.SUBSTR(h.DESIGNACAO, 4000, 1)                AS HORARIO_NOME,
      JSON_VALUE(al.REF_DOCENTE, '$.nome')                  AS DOCENTE_NOME,
      JSON_VALUE(al.REF_DOCENTE, '$.pkDocente')             AS CODIGO_DOCENTE,
      TO_CHAR(al.HORA_INICIO, 'HH24:MI')                    AS HORA_INICIO,
      TO_CHAR(al.HORA_TERMINO, 'HH24:MI')                   AS HORA_TERMINO,
      TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, ''))          AS CODIGO_GRADE,
      DBMS_LOB.SUBSTR(d.DESIGNACAO, 4000, 1)                AS DISCIPLINA,
      DBMS_LOB.SUBSTR(m.DESIGNACAO, 4000, 1)                AS MODALIDADE,
      DBMS_LOB.SUBSTR(at.DESIGNACAO, 4000, 1)               AS TIPO_AULA,
      DBMS_LOB.SUBSTR(ds.DESIGNACAO, 4000, 1)               AS DIA_SEMANA,
      ds.ORDEM                                              AS ORDEM_DIA_SEMANA,
      ds.DESCRICAO                                          AS DIA_SEMANA_DESC,
      au.DESIGNACAO                                         AS SALA,
      c2.SIGLA                                              AS CURSO,
      DBMS_LOB.SUBSTR(cl.DESIGNACAO, 4000, 1)               AS ANO,
      h.CAPACIDADE                                          AS CAPACIDADE,
      CASE WHEN h.APENASPRIMEIROANO = 1 THEN 'Sim' ELSE 'Não' END AS RESERVADO,
      h.FK_PERIODO                                          AS PERIODO,
      DBMS_LOB.SUBSTR(ew.DESIGNACAO, 4000, 1)               AS ESTADO,
      ew.COR                                                AS ESTADOCOR,
      ew.PK_ESTADO_HORARIO_WF                               AS ESTADOID,
      CASE WHEN h.DIPONIVEL = 1 THEN 'Disponivel' ELSE 'Fechado' END AS DISPONIBILIDADE,
      NVL(ut_criador.NOME, h.CREATED_BY)                    AS CRIADOPOR,
      NVL(ut_atualizador.NOME, h.LAST_UPDATED_BY)           AS ATUALIZADOPOR,
      TO_CHAR(h.UPDATED_AT, 'DD/MM/YYYY HH24:MI')           AS DATAULTIMAATUALIZACAO,
      TO_CHAR(h.CREATED_AT, 'DD/MM/YYYY HH24:MI')           AS DATACRIACAO
    FROM FK2_MGH_TB_HORARIO h
    INNER JOIN FK2_MGH_TB_AULA al
            ON al.FK_HORARIO = h.PK_HORARIO
    INNER JOIN FK2_TB_SALAS au
            ON JSON_VALUE(al.REF_SALA, '$.pk') = au.CODIGO
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
    LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF ew
            ON h.FK_ESTADO_HORARIO_WF = ew.PK_ESTADO_HORARIO_WF
    LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_criador
            ON h.CREATED_BY = ut_criador.PK_UTILIZADOR
    LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_atualizador
            ON h.LAST_UPDATED_BY = ut_atualizador.PK_UTILIZADOR
    LEFT JOIN FK2_TB_ANO_LECTIVO anl
            ON h.FK_ANO_LECTIVO = anl.CODIGO
    WHERE h.FK_ANO_LECTIVO = :anoLectivo
      AND h.FK_PERIODO = :periodo
      AND c.CODIGO = :gradeCurricular
      AND h.ACTIVE_STATE = 1
      AND al.ACTIVE_STATE = 1
      AND h.DIPONIVEL = 1
      AND h.FK_ESTADO_HORARIO_WF = 3
    ORDER BY ds.ORDEM, al.ORDEM
    `,
      { anoLectivo, periodo, gradeCurricular } as any,
    );

    // Normaliza o resultado (TypeORM com Oracle às vezes retorna [rows] ou rows diretamente)
    const rows = Array.isArray(result)
      ? Array.isArray(result[0])
        ? result[0]
        : result
      : [];

    // ---------------- AGRUPAR POR HORÁRIO ----------------
    const horariosMap = new Map<number, any>();

    for (const r of rows) {
      const horarioId = Number(r.CODIGO);

      if (!horariosMap.has(horarioId)) {
        horariosMap.set(horarioId, {
          codigo: horarioId,
          anoLectivo: r.ANO_LECTIVO,
          designacao: r.HORARIO_NOME,
          unidadeCurricularId: Number(r.CODIGO_GRADE),
          disciplina: r.DISCIPLINA,
          curso: r.CURSO,
          capacidade: Number(r.CAPACIDADE),
          reservado: r.RESERVADO,
          periodo: Number(r.PERIODO),
          estado: r.ESTADO,
          estadoCor: r.ESTADOCOR,
          estadoId: Number(r.ESTADOID),
          disponibilidade: r.DISPONIBILIDADE,
          criadoPor: r.CRIADOPOR,
          atualizadoPor: r.ATUALIZADOPOR || null,
          dataCriacao: r.DATACRIACAO,
          dataUltimaAtualizacao: r.DATAULTIMAATUALIZACAO,
          aulas: [],
        });
      }

      horariosMap.get(horarioId)!.aulas.push({
        docenteId: r.CODIGO_DOCENTE ? Number(r.CODIGO_DOCENTE) : null,
        docenteNome: r.DOCENTE_NOME,
        tipoAula: r.TIPO_AULA,
        modalidade: r.MODALIDADE,
        diaSemana: r.DIA_SEMANA,
        ordemDiaSemana: Number(r.ORDEM_DIA_SEMANA),
        sala: r.SALA,
        horaInicio: r.HORA_INICIO,
        horaTermino: r.HORA_TERMINO,
      });
    }

    return Array.from(horariosMap.values());
  }

  async findOneById(horarioId: number) {
    if (!horarioId || horarioId <= 0) {
      throw new BadRequestException('ID do horário inválido');
    }

    const horarioResult = await this.dataSource.query(
      `
    SELECT DISTINCT
      h."PK_HORARIO"                                            AS "CODIGO",
      h."DESIGNACAO"                                            AS "DESIGNACAO",
      h."FK_ANO_LECTIVO"                                            AS "FK_ANO_LECTIVO",
      TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "UNIDADECURRICULARID",
      d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
      c."SIGLA"                                                 AS "CURSO",
      c."CODIGO"                                                   AS CURSOID,
      cl."DESIGNACAO"                                           AS "ANO",
      h."CAPACIDADE"                                            AS "CAPACIDADE",
      CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
      h."FK_PERIODO"                                            AS "PERIODO",
      h."FK_SEMESTRE"                                            AS "SEMESTRE",
      ew."DESIGNACAO"                                           AS "ESTADO",
      ew."COR"                                                  AS "ESTADOCOR",
      ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
      CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
      NVL(ut_criador."NOME", h."CREATED_BY")                    AS "CRIADOPOR",
      NVL(ut_atualizador."NOME", h."LAST_UPDATED_BY")           AS "ATUALIZADOPOR",
      TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
      TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO"
    FROM "FK2_MGH_TB_HORARIO" h
    INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
      ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
    LEFT JOIN "FK2_TB_DISCIPLINAS" d
      ON g."CODIGO_DISCIPLINA" = d."CODIGO"
    LEFT JOIN "FK2_TB_CURSOS" c
      ON g."CODIGO_CURSO" = c."CODIGO"
    LEFT JOIN "FK2_TB_CLASSES" cl
      ON g."CODIGO_CLASSE" = cl."CODIGO"
    LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
      ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
    LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_criador
      ON h."CREATED_BY" = ut_criador."PK_UTILIZADOR"
    LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_atualizador
      ON h."LAST_UPDATED_BY" = ut_atualizador."PK_UTILIZADOR"
    WHERE h."PK_HORARIO" = :horarioId

  `,
      [horarioId],
    );

    const horarioRows = Array.isArray(horarioResult)
      ? Array.isArray(horarioResult[0])
        ? horarioResult[0]
        : horarioResult
      : [horarioResult];

    if (horarioRows.length === 0) {
      throw new NotFoundException(`Horário com ID ${horarioId} não encontrado`);
    }

    const h = horarioRows[0];

    // 2. Busca todas as aulas do horário
    const aulasResult = await this.dataSource.query(
      `
 SELECT
      a."PK_AULA"                    AS id,
      a."REF_AULA"                   AS refAula,
      a."REF_SALA"                   AS refSala,
      a."FK_TIPO_AULA"               AS tipoAulaId,
      tau."DESIGNACAO"                AS tipoAula,
      a."FK_MODALIDADE"              AS modalidadeId,
      mdl."DESIGNACAO"                AS modalidade,
      a."FK_DIA_DA_SEMANA"           AS diaSemanaId,
      dsm."DESIGNACAO"               AS diaSemana,
      a."ORDEM"                      AS ordem,
      sala."DESIGNACAO"              AS sala,
      sala."CODIGO"                  AS salaid,
    TO_CHAR(a."HORA_INICIO",  'HH24:MI') AS horaInicio,
   TO_CHAR(a."HORA_TERMINO", 'HH24:MI') AS horaTermino,

      a."REF_DOCENTE"                AS refDocente,
      a."REF_TURMAS_PARTICIPANTES"   AS turmasParticipantes,
      a."OBS"                        AS observacoes,
      a."CREATED_BY"                 AS criadoPor,
      a."LAST_UPDATED_BY"            AS atualizadoPor,
      TO_CHAR(a."CREATED_AT", 'DD/MM/YYYY HH24:MI')    AS criadoEm,
      TO_CHAR(a."UPDATED_AT", 'DD/MM/YYYY HH24:MI')    AS atualizadoEm,
      a."ACTIVE_STATE"               AS ativo,
      NVL(docente."NOME", 'Sem docente') AS docenteNome,
      JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) AS docenteId
    FROM "FK2_MGH_TB_AULA" a
    LEFT JOIN "FK2_MCA_TB_UTILIZADOR" docente
      ON JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) = docente."PK_UTILIZADOR"
      	LEFT 	JOIN "FK2_MGH_TB_TIPO_AULA" tau ON a.FK_TIPO_AULA = tau."PK_TIPO_AULA"
      	    	LEFT 	JOIN "FK2_MGH_TB_MODALIDADE" mdl ON a.FK_MODALIDADE  = mdl."PK_MODALIDADE"
      	    	LEFT  JOIN  "FK2_MGH_TB_DIA_DA_SEMANA" dsm ON a.FK_DIA_DA_SEMANA  = dsm."PK_DIA_DA_SEMANA"
      	    	LEFT JOIN "FK2_TB_SALAS" sala  ON JSON_VALUE(a."REF_AULA", '$.pk' RETURNING NUMBER) = sala."CODIGO"
    WHERE a."FK_HORARIO" = :horarioId
    ORDER BY a."FK_DIA_DA_SEMANA", a."ORDEM"
  `,
      [horarioId],
    );

    const aulas = Array.isArray(aulasResult)
      ? Array.isArray(aulasResult[0])
        ? aulasResult[0]
        : aulasResult
      : [];

    return {
      codigo: Number(h.CODIGO),
      fk_ano_lectivo: Number(h.FK_ANO_LECTIVO),
      designacao: h.DESIGNACAO,
      unidadeCurricularId: Number(h.UNIDADECURRICULARID),
      unidadeCurricular: h.UNIDADECURRICULAR,
      curso: h.CURSO,
      cursoId: Number(h.CURSOID),
      ano: h.ANO,
      capacidade: Number(h.CAPACIDADE),
      reservado: h.RESERVADO,
      semestre: Number(h.SEMESTRE),
      periodo: Number(h.PERIODO),
      estado: h.ESTADO,
      estadoCor: h.ESTADOCOR,
      estadoId: Number(h.ESTADOID),
      disponibilidade: h.DISPONIBILIDADE,
      disponivel: h.DISPONIBILIDADE === 'Disponivel',
      criadoPor: h.CRIADOPOR,
      atualizadoPor: h.ATUALIZADOPOR || null,
      dataUltimaAtualizacao: h.DATAULTIMAATUALIZACAO,
      dataCriacao: h.DATACRIACAO,

      // Array completo de aulas
      aulas: aulas.map((a: any) => ({
        id: Number(a.ID),

        tipoAula: a.TIPOAULA,
        tipoAulaId: Number(a.TIPOAULAID),
        modalidade: a.MODALIDADE,
        modalidadeId: Number(a.MODALIDADEID),
        diaSemana: a.DIASEMANA,
        diaSemanaId: Number(a.DIASEMANAID),
        ordem: Number(a.ORDEM),
        sala: a.SALA,
        salaid: Number(a.SALAID),
        horaInicio: a.HORAINICIO,
        horaTermino: a.HORATERMINO,
        docenteId: a.DOCENTEID ? Number(a.DOCENTEID) : null,
        docenteNome: a.DOCENTENOME,
        turmasParticipantes: a.TURMASPATICIPANTES,
        observacoes: a.OBSERVACOES,
        criadoPor: Number(a.CRIADOPOR),
        atualizadoPor: a.ATUALIZADOPOR ? Number(a.ATUALIZADOPOR) : null,
        criadoEm: a.CRIADOEM,
        atualizadoEm: a.ATUALIZADOEM,
        ativo: Boolean(a.ATIVO),
      })),
    };
  }
  async findOneByDesignation(dto: FindScheduleByDesignationDto) {
    const { designation, ano_lectivo, periodo } = dto;
    if (!designation) {
      throw new BadRequestException('Designação do horário inválido');
    }
    const horarioResult = await this.dataSource.query(
      `
SELECT DISTINCT
  h."PK_HORARIO"                                            AS "CODIGO",
  h."DESIGNACAO"                                            AS "DESIGNACAO",
  TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "UNIDADECURRICULARID",
  d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
  c."SIGLA"                                                 AS "CURSO",
  cl."DESIGNACAO"                                           AS "ANO",
  h."CAPACIDADE"                                            AS "CAPACIDADE",
  CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
  h."FK_SEMESTRE"                                           AS "SEMESTRE",
  h."FK_PERIODO"                                            AS "PERIODO",
  ew."DESIGNACAO"                                           AS "ESTADO",
  ew."COR"                                                  AS "ESTADOCOR",
  ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
  CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
  NVL(ut_criador."NOME", h."CREATED_BY")                    AS "CRIADOPOR",
  NVL(ut_atualizador."NOME", h."LAST_UPDATED_BY")           AS "ATUALIZADOPOR",
  TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
  TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO"
FROM "FK2_MGH_TB_HORARIO" h
INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
  ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
LEFT JOIN "FK2_TB_DISCIPLINAS" d
  ON g."CODIGO_DISCIPLINA" = d."CODIGO"
LEFT JOIN "FK2_TB_CURSOS" c
  ON g."CODIGO_CURSO" = c."CODIGO"
LEFT JOIN "FK2_TB_CLASSES" cl
  ON g."CODIGO_CLASSE" = cl."CODIGO"
LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
  ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_criador
  ON h."CREATED_BY" = ut_criador."PK_UTILIZADOR"
LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_atualizador
  ON h."LAST_UPDATED_BY" = ut_atualizador."PK_UTILIZADOR"
WHERE
  REGEXP_REPLACE(
    REGEXP_REPLACE(UPPER(h."DESIGNACAO"), '\s+', ''),
    '-H[0-9]+$', '-H'
  ) =
  REGEXP_REPLACE(
    REGEXP_REPLACE(UPPER(:designation), '\s+', ''),
    '-H[0-9]+$', '-H'
  )
  AND h."FK_PERIODO" = :periodo
  AND h."FK_ANO_LECTIVO" = :ano_lectivo
ORDER BY
  REGEXP_REPLACE(UPPER(h."DESIGNACAO"), '-H[0-9]+$', '-H'),
  TO_NUMBER(
    NVL(
      REGEXP_SUBSTR(h."DESIGNACAO", '-H([0-9]+)$', 1, 1, NULL, 1),
      0
    )
  )


  `,
      { designation, periodo, ano_lectivo } as any,
    );

    return {
      success: true,
      data: await toLowerCaseKeys(horarioResult),
    };
  }
  async validate(userId: number, horarioId: number) {
    if (!horarioId || horarioId <= 0) {
      throw new BadRequestException('ID do horário inválido');
    }

    // --------------------------------------------------------------------
    // 1) OBTER ESTADO ATUAL DO HORÁRIO
    // --------------------------------------------------------------------
    const rows = await this.dataSource.query(
      `
    SELECT "FK_ESTADO_HORARIO_WF" AS estadoId, "DESIGNACAO"
    FROM "FK2_MGH_TB_HORARIO"
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      [horarioId],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(
        `Horário ${horarioId} não encontrado ou inativo`,
      );
    }

    const horario = rows[0];
    const estadoAtual = Number(horario.ESTADOID);

    // --------------------------------------------------------------------
    // 2) BUSCAR O PRÓXIMO ESTADO NO WORKFLOW
    // --------------------------------------------------------------------
    const proximoEstadoResult = await this.dataSource.query(
      `
    SELECT "FK_NEXT" AS proximoEstadoId
    FROM "FK2_MGH_TB_ESTADO_HORARIO_WF"
    WHERE "PK_ESTADO_HORARIO_WF" = :estadoAtual
  `,
      [estadoAtual],
    );

    const proximoRows = Array.isArray(proximoEstadoResult)
      ? Array.isArray(proximoEstadoResult[0])
        ? proximoEstadoResult[0]
        : proximoEstadoResult
      : [proximoEstadoResult];

    if (
      !proximoRows ||
      proximoRows.length === 0 ||
      !proximoRows[0].PROXIMOESTADOID
    ) {
      throw new BadRequestException(
        'Não existe próximo estado definido para este horário',
      );
    }

    const proximoEstadoId = Number(proximoRows[0].PROXIMOESTADOID);

    // --------------------------------------------------------------------
    // 3) ATUALIZAR O ESTADO DO HORÁRIO
    // --------------------------------------------------------------------
    await this.dataSource.query(
      `
    UPDATE "FK2_MGH_TB_HORARIO"
    SET
      "FK_ESTADO_HORARIO_WF" = :proximoEstadoId,
      "UPDATED_AT" = SYSDATE,
      "LAST_UPDATED_BY" = :userId
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      {
        proximoEstadoId,
        userId,
        horarioId,
      } as any,
    );

    // --------------------------------------------------------------------
    // 4) RETORNAR RESPOSTA AMIGÁVEL
    // --------------------------------------------------------------------
    return {
      success: true,
      message: 'Horário validado com sucesso',
      horarioId,
      designacao: horario.DESIGNACAO,
      estadoAnterior: estadoAtual,
      novoEstadoId: proximoEstadoId,
      validadoPor: userId,
      dataValidacao: new Date().toISOString(),
    };
  }

  async toggleAvailability(userId: number, horarioId: number) {
    // 1. Busca o horário atual
    const result = await this.dataSource.query(
      `
    SELECT "PK_HORARIO", "DESIGNACAO", "DIPONIVEL"
    FROM "FK2_MGH_TB_HORARIO"
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      [horarioId],
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `Horário com ID ${horarioId} não encontrado ou inativo`,
      );
    }

    const horario = result[0];
    const atual = Number(horario.DIPONIVEL); // 0 ou 1
    const novoValor = atual === 1 ? 0 : 1; // toggle!

    const novoEstado = novoValor === 1 ? 'Disponível' : 'Fechado';

    await this.dataSource.query(
      `
    UPDATE "FK2_MGH_TB_HORARIO"
    SET
      "DIPONIVEL" = :novoValor,
      "UPDATED_AT" = SYSDATE,
      "LAST_UPDATED_BY" = :userId
    WHERE "PK_HORARIO" = :horarioId
      AND "ACTIVE_STATE" = 1
  `,
      {
        novoValor,
        userId,
        horarioId,
      } as any,
    );

    return {
      message: `Horário "${horario.DESIGNACAO}" passou a estar ${novoEstado}`,
      horarioId,
      disponivel: novoValor === 1,
      anterior: atual === 1,
      atualizadoPor: userId,
      dataAtualizacao: new Date().toISOString(),
    };
  }

  async findAllWithPermission(filters: ListScheduleWithPermissionDto) {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      anoCurricular,
      unidadeCurricular,
      estado,
      afetacaoDocente,
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('O campo anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;

    const params: any = {
      anoLectivo,
      offset,
      limit: offset + limit,
    };

    let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados."CRIADOPOR" DESC, dados."CODIGO" DESC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          h."PK_HORARIO"                                            AS "CODIGO",
          h."DESIGNACAO"                                            AS "DESIGNACAO",
          TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "GRADECURRICULARID",
          d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
          c."SIGLA"                                                 AS "CURSO",
          cl."DESIGNACAO"                                           AS "ANO",
          h."CAPACIDADE"                                            AS "CAPACIDADE",
          CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
          h."FK_SEMESTRE"                                           AS "SEMESTRE",
          ew."DESIGNACAO"                                           AS "ESTADO",
          ew."COR"                                                  AS "ESTADOCOR",
          ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
          CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
          NVL(ut."NOME", h."CREATED_BY")                             AS "CRIADOPOR",
          NVL(ut."NOME", h."LAST_UPDATED_BY")                       AS "ATUALIZADOPOR",
          TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
          TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO",

          /* ===== OBJETO PERMISSAO ===== */
          CASE
            WHEN p."PK_PERMISAO_EDICAO_HORARIO" IS NOT NULL AND p."ATIVE_STATE" = 1 THEN
              JSON_OBJECT(
                'codigo' VALUE p."PK_PERMISAO_EDICAO_HORARIO",
                'fkHorario' VALUE p."FK_HORARIO",
                'dataInicio' VALUE TO_CHAR(p."DATA_INICIO", 'YYYY-MM-DD HH24:MI:SS'),
                'dataFim' VALUE TO_CHAR(p."DATA_FIM", 'YYYY-MM-DD HH24:MI:SS'),
                'ativo' VALUE p."ATIVE_STATE",
                'codigoUtilizador' VALUE JSON_VALUE(p."RE_UTILIZADOR", '$.pk'),
                'utilizador' VALUE JSON_VALUE(p."RE_UTILIZADOR", '$.desc')
              )
            ELSE NULL
          END AS "PERMISSAO"

        FROM "FK2_MGH_TB_HORARIO" h

        INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
          ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"

        LEFT JOIN "FK2_TB_DISCIPLINAS" d
          ON g."CODIGO_DISCIPLINA" = d."CODIGO"

        LEFT JOIN "FK2_TB_CURSOS" c
          ON g."CODIGO_CURSO" = c."CODIGO"

        LEFT JOIN "FK2_TB_CLASSES" cl
          ON g."CODIGO_CLASSE" = cl."CODIGO"

        LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
          ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"

        LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
          ON h."CREATED_BY" = ut."PK_UTILIZADOR"

        /* ===== JOIN PERMISSAO ===== */
        LEFT JOIN "FK2_MGH_TB_PERMISAO_EDICAO_HORARIO" p
          ON p."FK_HORARIO" = h."PK_HORARIO"
         AND p."ATIVE_STATE" = 1

        WHERE h."ACTIVE_STATE" = 1
          AND TO_NUMBER(NULLIF(h."FK_ANO_LECTIVO", '')) = :anoLectivo
          AND ew."SIGLA" != 'ab'
  `;

    /* ===== FILTROS OPCIONAIS ===== */

    if (semestre != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_SEMESTRE", '')) = :semestre`;
      params.semestre = semestre;
    }

    if (periodo != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_PERIODO", '')) = :periodo`;
      params.periodo = periodo;
    }

    if (unidadeCurricular != null) {
      sql += ` AND h."FK_GRADE_CURRICULAR" = :unidadeCurricular`;
      params.unidadeCurricular = unidadeCurricular;
    }

    if (anoCurricular != null) {
      sql += ` AND g."CODIGO_CLASSE" = :anoCurricular`;
      params.anoCurricular = anoCurricular;
    }

    if (estado != null) {
      sql += ` AND ew."PK_ESTADO_HORARIO_WF" = :estado`;
      params.estado = estado;
    }

    if (curso != null) {
      sql += `
      AND (
        (
          (SELECT curs."GRAU"
           FROM "FK2_TB_CURSOS" curs
           WHERE curs."CODIGO" = :curso
             AND curs."STATUS_" = 1) = '0'
          AND g."FK_DEPARTAMENTO" = :curso
        )
        OR
        (
          (SELECT curs."GRAU"
           FROM "FK2_TB_CURSOS" curs
           WHERE curs."CODIGO" = :curso
             AND curs."STATUS_" = 1) != '0'
          AND g."CODIGO_CURSO" = :curso
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "FK2_TB_CURSOS" curs
        WHERE curs."CODIGO" = :curso
          AND curs."GRAU" = '0'
          AND ew."PK_ESTADO_HORARIO_WF" = 4
      )
    `;
      params.curso = curso;
    }

    if (afetacaoDocente === 1) {
      sql += `
      AND EXISTS (
        SELECT 1
        FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    } else if (afetacaoDocente === 2) {
      sql += `
      AND NOT EXISTS (
        SELECT 1
        FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    }

    /* ===== FECHO DA QUERY ===== */
    sql += `
        ) dados
      )
      WHERE rn > :offset
        AND rn <= :limit
      ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

    const data = result.map((row: any) => {
      const { RN, TOTAL_REGISTROS, PERMISSAO, ...item } = row;

      return {
        ...item,
        permissao: PERMISSAO ? JSON.parse(PERMISSAO) : null,
      };
    });
    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(filters: ListScheduleDto) {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      anoCurricular,
      unidadeCurricular,
      estado,
      afetacaoDocente,
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('O campo anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;
    const params: any = { anoLectivo, offset, limit: offset + limit };

    let sql = `
  SELECT *
  FROM (
    SELECT
      dados.*,
      ROW_NUMBER() OVER (ORDER BY dados."CRIADOPOR" DESC, dados."CODIGO" DESC) AS rn,
      COUNT(*) OVER () AS total_registros
    FROM (
      SELECT DISTINCT
        h."PK_HORARIO"                                            AS "CODIGO",
        h."DESIGNACAO"                                            AS "DESIGNACAO",
        TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "GRADECURRICULARID",
        d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",

        c."SIGLA"                                                 AS "CURSO",
        cl."DESIGNACAO"                               AS "ANO",
        h."CAPACIDADE"                                            AS "CAPACIDADE",
        CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
        h."FK_SEMESTRE"                                            AS "SEMESTRE",
        ew."DESIGNACAO"                                           AS "ESTADO",
        ew."COR"                                                  AS "ESTADOCOR",
        ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
        CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
        NVL(ut."NOME", h."CREATED_BY")                            AS "CRIADOPOR",
        NVL(ut."NOME", h."LAST_UPDATED_BY")                            AS "ATUALIZADOPOR",
        TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
        TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO"
      FROM "FK2_MGH_TB_HORARIO" h
      INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
        ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
      LEFT JOIN "FK2_TB_DISCIPLINAS" d
        ON g."CODIGO_DISCIPLINA" = d."CODIGO"
      LEFT JOIN "FK2_TB_CURSOS" c
        ON g."CODIGO_CURSO" = c."CODIGO"
      LEFT JOIN "FK2_TB_CLASSES" cl
        ON g."CODIGO_CLASSE" = cl."CODIGO"
      LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
        ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
      LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
        ON h."CREATED_BY" = ut."PK_UTILIZADOR"
      WHERE h."ACTIVE_STATE" = 1
        AND TO_NUMBER(NULLIF(h."FK_ANO_LECTIVO", '')) = :anoLectivo
       AND ew."SIGLA" != 'ab'
`;

    // Filtros opcionais (só adiciona se vier)
    if (semestre != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_SEMESTRE", '')) = :semestre`;
      params.semestre = semestre;
    }
    if (periodo != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_PERIODO", '')) = :periodo`;
      params.periodo = periodo;
    }
    if (unidadeCurricular != null) {
      console.log(unidadeCurricular);

      sql += ` AND h."FK_GRADE_CURRICULAR" = :unidadeCurricular`;
      params.unidadeCurricular = unidadeCurricular;
    }
    if (anoCurricular != null) {
      sql += ` AND g."CODIGO_CLASSE" = :anoCurricular`;
      params.anoCurricular = anoCurricular;
    }
    if (estado != null) {
      sql += ` AND ew."PK_ESTADO_HORARIO_WF" = :estado`;
      params.estado = estado;
    }

    // Curso: só aplica filtro se vier informado
    if (curso != null) {
      sql += `
      AND (
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) = '0'
          AND g."FK_DEPARTAMENTO" = :curso
        OR
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) != '0'
          AND g."CODIGO_CURSO" = :curso
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_TB_CURSOS" curs
        WHERE curs."CODIGO" = :curso
          AND curs."GRAU" = '0'
          AND ew."PK_ESTADO_HORARIO_WF" = 4
      )
    `;
      params.curso = curso;
    }

    // Afetação docente
    if (afetacaoDocente === 1) {
      sql += `
      AND EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    } else if (afetacaoDocente === 2) {
      sql += `
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    }

    // Fechar tudo corretamente
    sql += `
      ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;
    const data = result.map((row: any) => {
      const { RN, TOTAL_REGISTROS, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findAllRegistrationBySchedule(filters: ListScheduleDto) {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      anoCurricular,
      unidadeCurricular,
      estado,
      afetacaoDocente,
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('O campo anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;
    const params: any = { anoLectivo, offset, limit: offset + limit };

    let sql = `
  SELECT *
  FROM (
    SELECT
      dados.*,
      ROW_NUMBER() OVER (ORDER BY dados."CRIADOPOR" DESC, dados."CODIGO" DESC) AS rn,
      COUNT(*) OVER () AS total_registros
    FROM (
      SELECT DISTINCT
        h."PK_HORARIO"                                            AS "CODIGO",
        h."DESIGNACAO"                                            AS "DESIGNACAO",
        TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "UNIDADECURRICULARID",
        d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
        c."SIGLA"                                                 AS "CURSO",
        cl."DESIGNACAO"                               AS "ANO",
        h."CAPACIDADE"                                            AS "CAPACIDADE",
        CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
        h."FK_SEMESTRE"                                             AS "SEMESTRE",
          h."FK_PERIODO"                                            AS "PERIODO",
        ew."DESIGNACAO"                                           AS "ESTADO",
        ew."COR"                                                  AS "ESTADOCOR",
        ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
        CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
        NVL(ut."NOME", h."CREATED_BY")                            AS "CRIADOPOR",
        NVL(ut."NOME", h."LAST_UPDATED_BY")                            AS "ATUALIZADOPOR",
        TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
        TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO",
            -- AQUI O TOTAL DE ALUNOS POR HORÁRIO
    NVL(alu."TOTAL_ALUNOS", 0)                                AS "TOTAL_ALUNOS"
      FROM "FK2_MGH_TB_HORARIO" h
      INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
        ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
        -- SUBQUERY QUE FAZ O COUNT
  LEFT JOIN (
    SELECT
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER) AS "HORARIO_ID",
        COUNT(*) AS "TOTAL_ALUNOS"
    FROM "FK2_TB_GRADE_CURRICULAR_ALUNO"
     GROUP BY
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER)
) alu
    ON alu."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
   AND alu."HORARIO_ID" = h."PK_HORARIO"

      LEFT JOIN "FK2_TB_DISCIPLINAS" d
        ON g."CODIGO_DISCIPLINA" = d."CODIGO"
      LEFT JOIN "FK2_TB_CURSOS" c
        ON g."CODIGO_CURSO" = c."CODIGO"
      LEFT JOIN "FK2_TB_CLASSES" cl
        ON g."CODIGO_CLASSE" = cl."CODIGO"
      LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
        ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
      LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
        ON h."CREATED_BY" = ut."PK_UTILIZADOR"
      WHERE h."ACTIVE_STATE" = 1
        AND TO_NUMBER(NULLIF(h."FK_ANO_LECTIVO", '')) = :anoLectivo
        AND ew."SIGLA" != 'ab'
`;

    // Filtros opcionais (só adiciona se vier)
    if (semestre != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_SEMESTRE", '')) = :semestre`;
      params.semestre = semestre;
    }
    if (periodo != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_PERIODO", '')) = :periodo`;
      params.periodo = periodo;
    }
    if (unidadeCurricular != null) {
      sql += ` AND g."CODIGO" = :unidadeCurricular`;
      params.unidadeCurricular = unidadeCurricular;
    }
    if (anoCurricular != null) {
      sql += ` AND g."CODIGO_CLASSE" = :anoCurricular`;
      params.anoCurricular = anoCurricular;
    }
    if (estado != null) {
      sql += ` AND ew."PK_ESTADO_HORARIO_WF" = :estado`;
      params.estado = estado;
    }

    // Curso: só aplica filtro se vier informado
    if (curso != null) {
      sql += `
      AND (
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) = '0'
          AND g."FK_DEPARTAMENTO" = :curso
        OR
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) != '0'
          AND g."CODIGO_CURSO" = :curso
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_TB_CURSOS" curs
        WHERE curs."CODIGO" = :curso
          AND curs."GRAU" = '0'
          AND ew."PK_ESTADO_HORARIO_WF" = 4
      )
    `;
      params.curso = curso;
    }

    // Afetação docente
    if (afetacaoDocente === 1) {
      sql += `
      AND EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    } else if (afetacaoDocente === 2) {
      sql += `
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    }
    // Fechar tudo corretamente
    sql += `
      ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;
    const data = result.map((row: any) => {
      const { RN, TOTAL_REGISTROS, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async detailsRegistrationBySchedule(scheduleId: number) {
    let sql = `SELECT
GCA.CODIGO  AS codigo_grade_aluno ,
MAT.CODIGO AS NUMERO_DE_MATRICULA,
PRE.NOME_COMPLETO AS NOME_COMPLETO,
  H."PK_HORARIO"                                            AS "CODIGO_HORARIO",
      H."DESIGNACAO"                                            AS "DESIGNACAO",
      TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "UNIDADECURRICULARID",
      d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
      c."SIGLA"                                                 AS "CURSO",
      cl."DESIGNACAO"                             AS "ANO",
      H."CAPACIDADE"                                            AS "CAPACIDADE",
      CASE WHEN H."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
      H."FK_SEMESTRE"                                            AS "SEMESTRE",
        H."FK_PERIODO"                                            AS "PERIODO",
      ew."DESIGNACAO"                                           AS "ESTADO",
      ew."COR"                                                  AS "ESTADOCOR",
      ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
      CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
      NVL(ut_criador."NOME", h."CREATED_BY")                    AS "CRIADOPOR",
      NVL(ut_atualizador."NOME", h."LAST_UPDATED_BY")           AS "ATUALIZADOPOR",
      TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
      TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO"
FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
LEFT JOIN "FK2_MGH_TB_HORARIO" H
      ON JSON_VALUE(GCA."REF_HORARIO", '$.pk' RETURNING NUMBER) = H.PK_HORARIO
       INNER JOIN FK2_TB_MATRICULAS MAT
        ON MAT.CODIGO = gca.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM
        ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE
        ON PRE.CODIGO = ADM.PRE_INCRICAO
           INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
      ON TO_NUMBER(NULLIF(H."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
    LEFT JOIN "FK2_TB_DISCIPLINAS" d
      ON g."CODIGO_DISCIPLINA" = d."CODIGO"
    LEFT JOIN "FK2_TB_CURSOS" c
      ON g."CODIGO_CURSO" = c."CODIGO"
    LEFT JOIN "FK2_TB_CLASSES" cl
      ON g."CODIGO_CLASSE" = cl."CODIGO"
    LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
      ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
    LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_criador
      ON h."CREATED_BY" = ut_criador."PK_UTILIZADOR"
    LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut_atualizador
      ON h."LAST_UPDATED_BY" = ut_atualizador."PK_UTILIZADOR"
        WHERE h.PK_HORARIO =${scheduleId}
   `;

    const result = await this.dataSource.query(sql);

    return await toLowerCaseKeys(result);
  }

  async findAllDeleted(filters: ListScheduleDto) {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      anoCurricular,
      unidadeCurricular,
      estado,
      afetacaoDocente,
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('O campo anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;
    const params: any = { anoLectivo, offset, limit: offset + limit };

    let sql = `
  SELECT *
  FROM (
    SELECT
      dados.*,
      ROW_NUMBER() OVER (ORDER BY dados."CRIADOPOR" DESC, dados."CODIGO" DESC) AS rn,
      COUNT(*) OVER () AS total_registros
    FROM (
      SELECT DISTINCT
        h."PK_HORARIO"                                            AS "CODIGO",
        h."DESIGNACAO"                                            AS "DESIGNACAO",
        TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", ''))            AS "UNIDADECURRICULARID",
        d."DESIGNACAO"                                            AS "UNIDADECURRICULAR",
        c."SIGLA"                                                 AS "CURSO",
        cl."DESIGNACAO"                               AS "ANO",
        h."CAPACIDADE"                                            AS "CAPACIDADE",
        CASE WHEN h."APENASPRIMEIROANO" = 1 THEN 'Sim' ELSE 'Não' END AS "RESERVADO",
        h."FK_PERIODO"                                            AS "SEMESTRE",
        ew."DESIGNACAO"                                           AS "ESTADO",
        ew."COR"                                                  AS "ESTADOCOR",
        ew."PK_ESTADO_HORARIO_WF"                                 AS "ESTADOID",
        CASE WHEN h."DIPONIVEL" = 1 THEN 'Disponivel' ELSE 'Fechado' END AS "DISPONIBILIDADE",
        NVL(ut."NOME", h."CREATED_BY")                            AS "CRIADOPOR",
         NVL(ut."NOME", h."LAST_UPDATED_BY")                            AS "ATUALIZADOPOR",
        TO_CHAR(h."UPDATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATAULTIMAATUALIZACAO",
        TO_CHAR(h."CREATED_AT", 'DD/MM/YYYY HH24:MI')             AS "DATACRIACAO"
      FROM "FK2_MGH_TB_HORARIO" h
      INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
        ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
      LEFT JOIN "FK2_TB_DISCIPLINAS" d
        ON g."CODIGO_DISCIPLINA" = d."CODIGO"
      LEFT JOIN "FK2_TB_CURSOS" c
        ON g."CODIGO_CURSO" = c."CODIGO"
      LEFT JOIN "FK2_TB_CLASSES" cl
        ON g."CODIGO_CLASSE" = cl."CODIGO"
      LEFT JOIN "FK2_MGH_TB_ESTADO_HORARIO_WF" ew
        ON h."FK_ESTADO_HORARIO_WF" = ew."PK_ESTADO_HORARIO_WF"
      LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
        ON h."CREATED_BY" = ut."PK_UTILIZADOR"
      WHERE h."ACTIVE_STATE" = 0
        AND TO_NUMBER(NULLIF(h."FK_ANO_LECTIVO", '')) = :anoLectivo
        AND ew."SIGLA" != 'ab'
`;

    // Filtros opcionais (só adiciona se vier)
    if (semestre != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_SEMESTRE", '')) = :semestre`;
      params.semestre = semestre;
    }
    if (periodo != null) {
      sql += ` AND TO_NUMBER(NULLIF(h."FK_PERIODO", '')) = :periodo`;
      params.periodo = periodo;
    }
    if (unidadeCurricular != null) {
      sql += ` AND g."CODIGO" = :unidadeCurricular`;
      params.unidadeCurricular = unidadeCurricular;
    }
    if (anoCurricular != null) {
      sql += ` AND g."CODIGO_CLASSE" = :anoCurricular`;
      params.anoCurricular = anoCurricular;
    }
    if (estado != null) {
      sql += ` AND ew."PK_ESTADO_HORARIO_WF" = :estado`;
      params.estado = estado;
    }

    // Curso: só aplica filtro se vier informado
    if (curso != null) {
      sql += `
      AND (
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) = '0'
          AND g."FK_DEPARTAMENTO" = :curso
        OR
        (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) != '0'
          AND g."CODIGO_CURSO" = :curso
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_TB_CURSOS" curs
        WHERE curs."CODIGO" = :curso
          AND curs."GRAU" = '0'
          AND ew."PK_ESTADO_HORARIO_WF" = 4
      )
    `;
      params.curso = curso;
    }

    // Afetação docente
    if (afetacaoDocente === 1) {
      sql += `
      AND EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    } else if (afetacaoDocente === 2) {
      sql += `
      AND NOT EXISTS (
        SELECT 1 FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = h."PK_HORARIO"
          AND a."ACTIVE_STATE" = 1
          AND a."REF_DOCENTE" IS NOT NULL
          AND JSON_VALUE(a."REF_DOCENTE", '$.pkDocente' RETURNING NUMBER) != 0
      )
    `;
    }

    // Fechar tudo corretamente
    sql += `
      ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;
    const data = result.map((row: any) => {
      const { RN, TOTAL_REGISTROS, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findScheduleByUC({
    anoLectivo,
    curso,
    periodo,
    semestre,
    unidadeCurricular,
    limit = 25,
    page = 1,
  }: ListScheduleUCDto) {
    const offset = (page - 1) * limit;

    const baseWhere = `
      c.CODIGO               = ${unidadeCurricular}
      AND h.FK_ANO_LECTIVO   = ${anoLectivo}
      AND h.FK_SEMESTRE      = ${semestre}
      AND h.FK_PERIODO       = ${periodo}
      AND c.CODIGO_CURSO     = ${curso}
      AND al.ACTIVE_STATE    = 1
      AND h.FK_ESTADO_HORARIO_WF != 4
  `;

    // -------------------- QUERY PRINCIPAL --------------------
    const sql = `
    SELECT DISTINCT
      h.PK_HORARIO                                       AS CODIGO,
      h.DESIGNACAO                                       AS DESIGNACAO,
      TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, ''))       AS UNIDADECURRICULARID,
      d.DESIGNACAO                                       AS UNIDADECURRICULAR,
      c2.SIGLA                                           AS CURSO,
      cl.DESIGNACAO                                      AS ANO,
      h.CAPACIDADE                                       AS CAPACIDADE,
      CASE WHEN h.APENASPRIMEIROANO = 1 THEN 'Sim' ELSE 'Não' END AS RESERVADO,
      h.FK_PERIODO                                       AS PERIODO,
       h.FK_SEMESTRE                                      AS SEMESTRE,
      ew.DESIGNACAO                                      AS ESTADO,
      ew.COR                                             AS ESTADOCOR,
      ew.PK_ESTADO_HORARIO_WF                             AS ESTADOID,
      CASE WHEN h.DIPONIVEL = 1 THEN 'Disponivel' ELSE 'Fechado' END AS DISPONIBILIDADE,
      NVL(ut_criador.NOME, h.CREATED_BY)                 AS CRIADOPOR,
      NVL(ut_atualizador.NOME, h.LAST_UPDATED_BY)        AS ATUALIZADOPOR,
      TO_CHAR(h.UPDATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATAULTIMAATUALIZACAO,
      TO_CHAR(h.CREATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATACRIACAO
    FROM FK2_MGH_TB_HORARIO h
        INNER JOIN FK2_MGH_TB_AULA al
                ON al.FK_HORARIO = h.PK_HORARIO
        INNER JOIN FK2_TB_GRADE_CURRICULAR c
                ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
        LEFT JOIN FK2_TB_DISCIPLINAS d
                ON c.CODIGO_DISCIPLINA = d.CODIGO
        LEFT JOIN FK2_TB_CURSOS c2
                ON c.CODIGO_CURSO = c2.CODIGO
        LEFT JOIN FK2_TB_CLASSES cl
                ON c.CODIGO_CLASSE = cl.CODIGO
        LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF ew
                ON h.FK_ESTADO_HORARIO_WF = ew.PK_ESTADO_HORARIO_WF
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_criador
                ON h.CREATED_BY = ut_criador.PK_UTILIZADOR
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_atualizador
                ON h.LAST_UPDATED_BY = ut_atualizador.PK_UTILIZADOR
    WHERE ${baseWhere}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    // -------------------- QUERY DE CONTAGEM --------------------
    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
        SELECT DISTINCT h.PK_HORARIO
        FROM FK2_MGH_TB_HORARIO h
          INNER JOIN FK2_MGH_TB_AULA al
                  ON al.FK_HORARIO = h.PK_HORARIO
          INNER JOIN FK2_TB_GRADE_CURRICULAR c
                  ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
        WHERE ${baseWhere}
    )
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findScheduleByDocente({
    docenteId,
    anoLectivo,
    semestre,
    periodo,
    limit = 25,
    page = 1,
  }: ListScheduleDocenteDto) {
    const offset = (page - 1) * limit;

    // Construindo WHERE dinamicamente baseado nos campos opcionais
    const whereConditions: string[] = [
      `TO_NUMBER(json_value(al.REF_DOCENTE,'$.pkDocente')) = ${docenteId}`,
      `h.FK_ANO_LECTIVO = ${anoLectivo}`,
      `h.ACTIVE_STATE = 1`,
      `al.ACTIVE_STATE = 1`,
      `h.DIPONIVEL = 1`,
      `h.FK_ESTADO_HORARIO_WF != 4`,
    ];

    // Adiciona semestre apenas se fornecido
    if (semestre !== undefined && semestre !== null) {
      whereConditions.push(`h.FK_SEMESTRE = ${semestre}`);
    }

    // Adiciona período apenas se fornecido
    if (periodo !== undefined && periodo !== null) {
      whereConditions.push(`h.FK_PERIODO = ${periodo}`);
    }

    const baseWhere = whereConditions.join('\n      AND ');

    // -------------------- QUERY PRINCIPAL (SEM DISTINCT) --------------------
    const sql = `
    SELECT
      h.PK_HORARIO                                       AS CODIGO,
      DBMS_LOB.SUBSTR(h.DESIGNACAO, 4000, 1)             AS HORARIO_NOME,
      json_value(al.REF_DOCENTE, '$.nome')               AS DOCENTE_NOME,
      json_value(al.REF_DOCENTE, '$.pkDocente')          AS CODIGO_DOCENTE,
      al.HORA_INICIO                                     AS HORA_INICIO,
      al.HORA_TERMINO                                    AS HORA_TERMINO,
      TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, ''))       AS CODIGO_GRADE,
      DBMS_LOB.SUBSTR(d.DESIGNACAO, 4000, 1)             AS DISCIPLINA,
      DBMS_LOB.SUBSTR(m.DESIGNACAO, 4000, 1)             AS MODALIDADE,
      DBMS_LOB.SUBSTR(at.DESIGNACAO, 4000, 1)            AS TIPO_AULA,
      DBMS_LOB.SUBSTR(ds.DESIGNACAO, 4000, 1)            AS DIA_SEMANA,
      ds.ORDEM                                           AS ORDEM_DIA_SEMANA,
      json_value(al.REF_SALA, '$.desc')                  AS SALA,
      c.CODIGO_CURSO                                     AS CODIGO_CURSO,
      c2.SIGLA                                           AS CURSO,
      DBMS_LOB.SUBSTR(cl.DESIGNACAO, 4000, 1)            AS ANO,
      h.CAPACIDADE                                       AS CAPACIDADE,
      CASE WHEN h.APENASPRIMEIROANO = 1 THEN 'Sim' ELSE 'Não' END AS RESERVADO,
      h.FK_PERIODO                                       AS PERIODO,
      DBMS_LOB.SUBSTR(ew.DESIGNACAO, 4000, 1)            AS ESTADO,
      ew.COR                                             AS ESTADOCOR,
      ew.PK_ESTADO_HORARIO_WF                            AS ESTADOID,
      CASE WHEN h.DIPONIVEL = 1 THEN 'Disponivel' ELSE 'Fechado' END AS DISPONIBILIDADE,
      NVL(ut_criador.NOME, h.CREATED_BY)                 AS CRIADOPOR,
      NVL(ut_atualizador.NOME, h.LAST_UPDATED_BY)        AS ATUALIZADOPOR,
      TO_CHAR(h.UPDATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATAULTIMAATUALIZACAO,
      TO_CHAR(h.CREATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATACRIACAO
    FROM FK2_MGH_TB_HORARIO h
        INNER JOIN FK2_MGH_TB_AULA al
                ON al.FK_HORARIO = h.PK_HORARIO
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
        LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF ew
                ON h.FK_ESTADO_HORARIO_WF = ew.PK_ESTADO_HORARIO_WF
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_criador
                ON h.CREATED_BY = ut_criador.PK_UTILIZADOR
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_atualizador
                ON h.LAST_UPDATED_BY = ut_atualizador.PK_UTILIZADOR
    WHERE ${baseWhere}

    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    // -------------------- QUERY DE CONTAGEM --------------------
    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_MGH_TB_HORARIO h
      INNER JOIN FK2_MGH_TB_AULA al
              ON al.FK_HORARIO = h.PK_HORARIO
      INNER JOIN FK2_MGH_TB_TIPO_AULA at
              ON at.PK_TIPO_AULA = al.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA ds
              ON ds.PK_DIA_DA_SEMANA = al.FK_DIA_DA_SEMANA
      INNER JOIN FK2_MGH_TB_MODALIDADE m
              ON m.PK_MODALIDADE = al.FK_MODALIDADE
      INNER JOIN FK2_TB_GRADE_CURRICULAR c
              ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findScheduleByDayOfTheweek({
    unidadeCurricular,
    anoCurricular,
    diaSemana,
    anoLectivo,
    semestre,
    periodo,
    curso,
    limit = 10,
    page = 1,
  }: ListScheduleDayOfWeekto) {
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [
      `c.CODIGO_CURSO  = ${curso}`,
      `ds.PK_DIA_DA_SEMANA = ${diaSemana}`,
      `h.FK_ANO_LECTIVO = ${anoLectivo}`,
      `h.ACTIVE_STATE = 1`,
      `al.ACTIVE_STATE = 1`,
      `h.DIPONIVEL = 1`,
      `h.FK_ESTADO_HORARIO_WF != 4`,
    ];
    // Adiciona semestre apenas se fornecido
    if (semestre !== undefined && semestre !== null) {
      whereConditions.push(`h.FK_SEMESTRE = ${semestre}`);
    }

    // Adiciona período apenas se fornecido
    if (periodo !== undefined && periodo !== null) {
      whereConditions.push(`h.FK_PERIODO = ${periodo}`);
    }

    if (unidadeCurricular !== undefined && unidadeCurricular !== null) {
      whereConditions.push(` c.CODIGO = ${unidadeCurricular}`);
    }
    if (anoCurricular !== undefined && anoCurricular !== null) {
      whereConditions.push(`c.CODIGO_CLASSE =${anoCurricular}`);
    }

    const baseWhere = whereConditions.join('\n      AND ');

    // -------------------- QUERY PRINCIPAL (SEM DISTINCT) --------------------
    const sql = `
    SELECT
      h.PK_HORARIO                                       AS CODIGO,
      DBMS_LOB.SUBSTR(h.DESIGNACAO, 4000, 1)             AS HORARIO_NOME,
      json_value(al.REF_DOCENTE, '$.nome')               AS DOCENTE_NOME,
      json_value(al.REF_DOCENTE, '$.pkDocente')          AS CODIGO_DOCENTE,
      TO_CHAR(al."HORA_INICIO",  'HH24:MI') AS HORA_INICIO,
      TO_CHAR(al."HORA_TERMINO", 'HH24:MI') AS HORA_TERMINO,
      TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, ''))       AS CODIGO_GRADE,
      DBMS_LOB.SUBSTR(d.DESIGNACAO, 4000, 1)             AS DISCIPLINA,
      DBMS_LOB.SUBSTR(m.DESIGNACAO, 4000, 1)             AS MODALIDADE,
      DBMS_LOB.SUBSTR(at.DESIGNACAO, 4000, 1)            AS TIPO_AULA,
      DBMS_LOB.SUBSTR(ds.DESIGNACAO, 4000, 1)            AS DIA_SEMANA,
      ds.ORDEM                                           AS ORDEM_DIA_SEMANA,
     au.DESIGNACAO                                        AS SALA,
      c.CODIGO_CURSO                                     AS CODIGO_CURSO,
      c2.SIGLA                                           AS CURSO,
      DBMS_LOB.SUBSTR(cl.DESIGNACAO, 4000, 1)            AS ANO,
      h.CAPACIDADE                                       AS CAPACIDADE,
      CASE WHEN h.APENASPRIMEIROANO = 1 THEN 'Sim' ELSE 'Não' END AS RESERVADO,
      h.FK_PERIODO                                       AS PERIODO,
      DBMS_LOB.SUBSTR(ew.DESIGNACAO, 4000, 1)            AS ESTADO,
      ew.COR                                             AS ESTADOCOR,
      ew.PK_ESTADO_HORARIO_WF                            AS ESTADOID,
      CASE WHEN h.DIPONIVEL = 1 THEN 'Disponivel' ELSE 'Fechado' END AS DISPONIBILIDADE,
      NVL(ut_criador.NOME, h.CREATED_BY)                 AS CRIADOPOR,
      NVL(ut_atualizador.NOME, h.LAST_UPDATED_BY)        AS ATUALIZADOPOR,
      TO_CHAR(h.UPDATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATAULTIMAATUALIZACAO,
      TO_CHAR(h.CREATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATACRIACAO
    FROM FK2_MGH_TB_HORARIO h
        INNER JOIN FK2_MGH_TB_AULA al
                ON al.FK_HORARIO = h.PK_HORARIO
                  INNER JOIN FK2_MGH_TB_AULA al
                ON al.FK_HORARIO = h.PK_HORARIO
               INNER JOIN     FK2_TB_SALAS        au
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
        LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF ew
                ON h.FK_ESTADO_HORARIO_WF = ew.PK_ESTADO_HORARIO_WF
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_criador
                ON h.CREATED_BY = ut_criador.PK_UTILIZADOR
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_atualizador
                ON h.LAST_UPDATED_BY = ut_atualizador.PK_UTILIZADOR
    WHERE ${baseWhere}

    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    // -------------------- QUERY DE CONTAGEM --------------------
    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_MGH_TB_HORARIO h
      INNER JOIN FK2_MGH_TB_AULA al
              ON al.FK_HORARIO = h.PK_HORARIO
      INNER JOIN FK2_MGH_TB_TIPO_AULA at
              ON at.PK_TIPO_AULA = al.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA ds
              ON ds.PK_DIA_DA_SEMANA = al.FK_DIA_DA_SEMANA
      INNER JOIN FK2_MGH_TB_MODALIDADE m
              ON m.PK_MODALIDADE = al.FK_MODALIDADE
      INNER JOIN FK2_TB_GRADE_CURRICULAR c
              ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findScheduleByClassRoom({
    unidadeCurricular,
    anoCurricular,
    sala,
    anoLectivo,
    semestre,
    periodo,
    curso,
    limit = 10,
    page = 1,
  }: ListScheduleClassRoomDto) {
    const offset = (page - 1) * limit;

    const whereConditions: string[] = [
      `c.CODIGO_CURSO  = ${curso}`,
      `json_value(al.REF_SALA, '$.pk')  = ${sala}`,
      `h.FK_ANO_LECTIVO = ${anoLectivo}`,
      `h.ACTIVE_STATE = 1`,
      `al.ACTIVE_STATE = 1`,
      `h.DIPONIVEL = 1`,
      `h.FK_ESTADO_HORARIO_WF != 4`,
    ];
    // Adiciona semestre apenas se fornecido
    if (semestre !== undefined && semestre !== null) {
      whereConditions.push(`h.FK_SEMESTRE = ${semestre}`);
    }

    // Adiciona período apenas se fornecido
    if (periodo !== undefined && periodo !== null) {
      whereConditions.push(`h.FK_PERIODO = ${periodo}`);
    }

    if (unidadeCurricular !== undefined && unidadeCurricular !== null) {
      whereConditions.push(` c.CODIGO = ${unidadeCurricular}`);
    }
    if (anoCurricular !== undefined && anoCurricular !== null) {
      whereConditions.push(`c.CODIGO_CLASSE =${anoCurricular}`);
    }

    const baseWhere = whereConditions.join('\n      AND ');

    // -------------------- QUERY PRINCIPAL (SEM DISTINCT) --------------------
    const sql = `
    SELECT
      h.PK_HORARIO                                       AS CODIGO,
      DBMS_LOB.SUBSTR(h.DESIGNACAO, 4000, 1)             AS HORARIO_NOME,
      json_value(al.REF_DOCENTE, '$.nome')               AS DOCENTE_NOME,
      json_value(al.REF_DOCENTE, '$.pkDocente')          AS CODIGO_DOCENTE,
      al.HORA_INICIO                                     AS HORA_INICIO,
      al.HORA_TERMINO                                    AS HORA_TERMINO,
      TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, ''))       AS CODIGO_GRADE,
      DBMS_LOB.SUBSTR(d.DESIGNACAO, 4000, 1)             AS DISCIPLINA,
      DBMS_LOB.SUBSTR(m.DESIGNACAO, 4000, 1)             AS MODALIDADE,
      DBMS_LOB.SUBSTR(at.DESIGNACAO, 4000, 1)            AS TIPO_AULA,
      DBMS_LOB.SUBSTR(ds.DESIGNACAO, 4000, 1)            AS DIA_SEMANA,
      ds.ORDEM                                           AS ORDEM_DIA_SEMANA,
      au.DESIGNACAO                                          AS SALA,
      json_value(al.REF_SALA, '$.pk')                      AS SALAID,
      c.CODIGO_CURSO                                     AS CODIGO_CURSO,
      c2.SIGLA                                           AS CURSO,
      DBMS_LOB.SUBSTR(cl.DESIGNACAO, 4000, 1)            AS ANO,
      h.CAPACIDADE                                       AS CAPACIDADE,
      CASE WHEN h.APENASPRIMEIROANO = 1 THEN 'Sim' ELSE 'Não' END AS RESERVADO,
      h.FK_PERIODO                                       AS PERIODO,
      DBMS_LOB.SUBSTR(ew.DESIGNACAO, 4000, 1)            AS ESTADO,
      ew.COR                                             AS ESTADOCOR,
      ew.PK_ESTADO_HORARIO_WF                            AS ESTADOID,
      CASE WHEN h.DIPONIVEL = 1 THEN 'Disponivel' ELSE 'Fechado' END AS DISPONIBILIDADE,
      NVL(ut_criador.NOME, h.CREATED_BY)                 AS CRIADOPOR,
      NVL(ut_atualizador.NOME, h.LAST_UPDATED_BY)        AS ATUALIZADOPOR,
      TO_CHAR(h.UPDATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATAULTIMAATUALIZACAO,
      TO_CHAR(h.CREATED_AT, 'DD/MM/YYYY HH24:MI')        AS DATACRIACAO
    FROM FK2_MGH_TB_HORARIO h
        INNER JOIN FK2_MGH_TB_AULA al
                ON al.FK_HORARIO = h.PK_HORARIO
                INNER JOIN     FK2_TB_SALAS        au
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
        LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF ew
                ON h.FK_ESTADO_HORARIO_WF = ew.PK_ESTADO_HORARIO_WF
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_criador
                ON h.CREATED_BY = ut_criador.PK_UTILIZADOR
        LEFT JOIN FK2_MCA_TB_UTILIZADOR ut_atualizador
                ON h.LAST_UPDATED_BY = ut_atualizador.PK_UTILIZADOR
    WHERE ${baseWhere}

    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    // -------------------- QUERY DE CONTAGEM --------------------
    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_MGH_TB_HORARIO h
      INNER JOIN FK2_MGH_TB_AULA al
              ON al.FK_HORARIO = h.PK_HORARIO
      INNER JOIN FK2_MGH_TB_TIPO_AULA at
              ON at.PK_TIPO_AULA = al.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA ds
              ON ds.PK_DIA_DA_SEMANA = al.FK_DIA_DA_SEMANA
      INNER JOIN FK2_MGH_TB_MODALIDADE m
              ON m.PK_MODALIDADE = al.FK_MODALIDADE
      INNER JOIN FK2_TB_GRADE_CURRICULAR c
              ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = c.CODIGO
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);
    console.log(result);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async moveStudents(dto: MoveStudentsToScheduleDto, userId: number) {
    const { fromScheduleId, toScheduleId, studentsCurriculumIds } = dto;
    if (fromScheduleId == toScheduleId) {
      throw new BadRequestException(
        'O horário de origem e o horário de destino devem ser diferentes',
      );
    }
    const from = await this.getschedule(fromScheduleId);
    if (!from || from.length === 0) {
      throw new NotFoundException(
        `Horário ${from}  de Origem não encontrado ou inativo`,
      );
    }
    const to = await this.getschedule(toScheduleId);
    if (!to || to.length === 0) {
      throw new NotFoundException(
        `Horário ${to} de Destino não encontrado ou inativo`,
      );
    }

    if (to[0].TOTAL_ALUNOS + studentsCurriculumIds.length > to[0].CAPACIDADE) {
      throw new BadRequestException(
        `Com Este número de estudantes selecionado, vas exceder a capacidade suportado. Atual: ${to[0].TOTAL_ALUNOS} Previsão Com os novos : ${to[0].CAPACIDADE + studentsCurriculumIds.length}`,
      );
    }
    const user = await this.getUser(userId);

    const json_schedule = `{"pk":${to[0].CODIGO},"desc":"${escapeQuotes(to[0].DESIGNACAO)}", "corLetra": "black", "disponivel": true}`;
    const json_user = `{"pk": ${userId}, "desc": ${escapeQuotes(user?.nome || '')}, "corLetra": "black", "disponivel": true}`;

    if (studentsCurriculumIds.length === 0) return;
    const validIdsResult = await this.dataSource.query(`
  SELECT "CODIGO"
  FROM "FK2_TB_GRADE_CURRICULAR_ALUNO"
  WHERE "CODIGO" IN (${studentsCurriculumIds.join(',')})
`);

    const validIds = validIdsResult.map((row) => row.CODIGO);

    if (validIds.length === 0) {
      console.warn('Nenhum aluno válido encontrado para atualizar o horário.');
      throw new NotFoundException(
        `Nenhum aluno válido encontrado para atualizar o horário`,
      );
    }

    console.log(`Atualizando horário de ${validIds.length} aluno(s)`);

    await this.dataSource.query(
      `
  UPDATE "FK2_TB_GRADE_CURRICULAR_ALUNO"
  SET
    "REF_HORARIO" = :json_schedule,
    "USER_ID"=:userId,
    "CODIGO_UTILIZADOR" =:utilizador,
    "REF_UTILIZADOR"=:json_user,
    "UPDATED_AT" = SYSDATE
  WHERE "CODIGO" IN (${validIds.join(',')})
`,
      { json_schedule, userId, utilizador: userId, json_user } as any,
    );

    return {
      success: true,
      message: `${studentsCurriculumIds.length} Estudante(s) Movimentados com sucesso`,
    };
  }

  private async createOrUpdateHorario(
    userId: number = 1,
    dto: CreateScheduleDto,
    horarioIdParam?: number,
  ): Promise<any> {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      unidadeCurricular,
      designacao,
      capacidade = 30,
      turma,
      modalidade,

      apenasPrimeiroAno = false,
      estadoHorario = 2,
      aulas,
      obs = null,
    } = dto;

    // === 1. Buscar dados descritivos ===
    const v_grade_curricular = await this.getGradeCurricular(unidadeCurricular);

    const v_desc_grade =
      await this.getDescricaoGradeCurricular(v_grade_curricular);
    const v_desc_periodo = await this.getDescricaoPeriodo(periodo);
    const v_desc_ano_lectivo = await this.getDescricaoAnoLectivo(anoLectivo);

    const v_json_grade = `{"pk":${v_grade_curricular},"desc":"${escapeQuotes(v_desc_grade)}","corLetra":"black"}`;
    const v_json_periodo = `{"pkPeriodo":${periodo},"desc":"${escapeQuotes(v_desc_periodo)}"}`;
    const v_json_ano_lectivo = `{"pk":${anoLectivo},"desc":"${escapeQuotes(v_desc_ano_lectivo)}","corLetra":"black"}`;

    // JSON dos docentes (array)
    const docentesJson: string[] = [];
    for (const aula of aulas) {
      const nomeDoc = await this.getNomeDocente(aula.docente);
      docentesJson.push(
        `{"pkDocente":${aula.docente},"nomeAbreviado":"${escapeQuotes(nomeDoc)}"}`,
      );
    }
    const v_json_docentes =
      docentesJson.length > 0 ? `[${docentesJson.join(',')}]` : '[]';

    let horarioId: number;

    if (!horarioIdParam) {
      // ==================== INSERT ====================
      const result = await this.dataSource.query(
        `
      INSERT INTO fk2_mgh_tb_horario (
        DESIGNACAO,
        REF_GRADE_CURRICULAR,
        REF_PERIODICIDADE,
        REF_ANO_LECTIVO,
        REF_CURSOS_PERMITIDOS,
        REF_TURMA,
        FK_ESTADO_HORARIO_WF,
        OBS,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_STATE,
        CAPACIDADE,
        APENASPRIMEIROANO,
        DIPONIVEL,
        HORARIO_REUTILIZADO,

        -- FKs como VARCHAR2
        FK_GRADE_CURRICULAR,
        FK_SEMESTRE,
        FK_ANO_LECTIVO,
        FK_CURSOS_PERMITIDOS,
        FK_PERIODO,
        FK_TURMA
      ) VALUES (
        :designacao,
        :refGrade,
        :refPeriodo,
        :refAnoLectivo,
        :refCursos,           -- mesmo JSON da grade (ou podes mudar se quiseres outro formato)
        :refTurma,
        :estadoHorario,
        :obs,
        :userId,
        :userId,
        SYSDATE,
        SYSDATE,
        1,                    -- ACTIVE_STATE
        :capacidade,
        :apenasPrimeiroAno,
        1,                    -- DIPONIVEL (disponível para alunos)
        0,                    -- HORARIO_REUTILIZADO (novo = 0)

        TO_CHAR(:gradeCurricular),
        TO_CHAR(:semestre),
        TO_CHAR(:anoLectivo),
        TO_CHAR(:curso),
        TO_CHAR(:periodo),
        TO_CHAR(:turma)
      ) RETURNING PK_HORARIO INTO :outId
    `,
        {
          designacao,
          refGrade: v_json_grade,
          refPeriodo: v_json_periodo,
          refAnoLectivo: v_json_ano_lectivo,
          refCursos: v_json_grade,
          refTurma: turma ? `{"pk":${turma}}` : null,
          estadoHorario,
          obs,
          userId,
          capacidade,
          apenasPrimeiroAno: apenasPrimeiroAno ? 1 : 0,
          gradeCurricular: v_grade_curricular,
          semestre,
          anoLectivo,
          curso,
          periodo,
          turma: turma || null,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      // Pega o ID retornado
      horarioId = result.outId[0];
    } else {
      // ==================== UPDATE ====================
      horarioId = horarioIdParam;

      await this.dataSource.query(
        `
      UPDATE fk2_mgh_tb_horario
         SET DESIGNACAO              = :designacao,
             REF_GRADE_CURRICULAR    = :refGrade,
             REF_PERIODICIDADE       = :refPeriodo,
             REF_ANO_LECTIVO         = :refAnoLectivo,
             REF_CURSOS_PERMITIDOS   = :refCursos,
             REF_TURMA               = :refTurma,
             FK_ESTADO_HORARIO_WF    = :estadoHorario,
             OBS                     = :obs,
             LAST_UPDATED_BY         = :userId,
             UPDATED_AT              = SYSDATE,
             CAPACIDADE              = :capacidade,
             APENASPRIMEIROANO       = :apenasPrimeiroAno,

             FK_GRADE_CURRICULAR     = TO_CHAR(:gradeCurricular),
             FK_SEMESTRE             = TO_CHAR(:semestre),
             FK_ANO_LECTIVO          = TO_CHAR(:anoLectivo),
             FK_CURSOS_PERMITIDOS    = TO_CHAR(:curso),
             FK_PERIODO              = TO_CHAR(:periodo),
             FK_TURMA                = TO_CHAR(:turma)
       WHERE PK_HORARIO = :horarioId
    `,
        {
          designacao,
          refGrade: v_json_grade,
          refPeriodo: v_json_periodo,
          refAnoLectivo: v_json_ano_lectivo,
          refCursos: v_json_grade,
          refTurma: turma ? `{"pk":${turma}}` : null,
          estadoHorario,
          obs,
          userId,
          capacidade,
          apenasPrimeiroAno: apenasPrimeiroAno ? 1 : 0,
          gradeCurricular: v_grade_curricular,
          semestre,
          anoLectivo,
          curso,
          periodo,
          turma: turma || null,
          horarioId,
        } as any,
      );

      // Limpa aulas antigas
      await this.dataSource.query(
        `DELETE FROM fk2_mgh_tb_aula WHERE fk_horario = :1`,
        [horarioId],
      );
    }

    // === INSERIR AULAS DETALHADAS (tabela filha) ===
    // 1. Busca o maior PK_AULA atual (apenas uma vez, fora do loop)
    let maxPkAulaResult = await this.dataSource.query(`
  SELECT MAX(PK_AULA) AS max_id FROM FK2_MGH_TB_AULA
`);

    let proximoPkAula = (maxPkAulaResult[0]?.MAX_ID || 0) + 1;

    console.log(
      `[DEV] Maior PK_AULA atual: ${maxPkAulaResult[0]?.MAX_ID}. Próximo será: ${proximoPkAula}`,
    );

    // 2. Loop das aulas com PK_AULA manual e incremental
    for (const aula of aulas) {
      const nomeDocente = await this.getNomeDocente(aula.docente);
      const escape = (str: string) =>
        str.replace(/"/g, '\\"').replace(/\n/g, '\\n');

      const ref_docente = `{"pkDocente":${aula.docente},"nome":"${escape(nomeDocente)}"}`;

      const v_desc_sala = await this.getDescricaoSala(aula.sala);
      const ref_sala = aula.sala
        ? `{"pk":${aula.sala},"desc":"${escape(v_desc_sala)}"}`
        : `{"pk":null,"desc":"Por atribuir"}`;

      // Corrigi aqui: estava faltando aspas no desc do ref_aula
      const ref_aula = `{"pk":${aula.tipoAula},"desc":"${escape(v_desc_grade || '')}"}`;

      const ref_turmas = dto.turma ? `{"pk":${dto.turma}}` : null;

      try {
        await this.dataSource.query(
          `
      INSERT INTO FK2_MGH_TB_AULA (
        PK_AULA,                  -- ← Adicionado manualmente
        FK_HORARIO,
        FK_DIA_DA_SEMANA,
        FK_TIPO_AULA,
        FK_MODALIDADE,
        ORDEM,
        HORA_INICIO,
        HORA_TERMINO,
        REF_AULA,
        REF_SALA,
        REF_DOCENTE,
        REF_TURMAS_PARTICIPANTES,
        OBS,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_STATE
      ) VALUES (
        :pkAula,                  -- ← Valor manual
        :horarioId,
        :diaSemana,
        :fkTipoAula,
        :fkModalidade,
        :ordem,
        TO_DATE(:horaInicio, 'HH24:MI'),
        TO_DATE(:horaFim, 'HH24:MI'),
        :refAula,
        :refSala,
        :refDocente,
        :refTurmas,
        :obs,
        :userId,
        :userId,
        SYSDATE,
        SYSDATE,
        1
      )
      `,
          {
            pkAula: proximoPkAula, // ← Valor incremental
            horarioId,
            diaSemana: aula.diaSemana,
            fkTipoAula: aula.tipoAula,
            fkModalidade: modalidade,
            ordem: aula.ordemTempo || 1,
            horaInicio: aula.hora_inicio,
            horaFim: aula.hora_fim,
            refAula: ref_aula,
            refSala: ref_sala,
            refDocente: ref_docente,
            refTurmas: ref_turmas,
            obs: aula.obs || null,
            userId: userId || 1,
          } as any,
        );

        console.log(
          `[DEV] Aula inserida com PK_AULA = ${proximoPkAula} (Horário: ${horarioId}, Dia: ${aula.diaSemana}, Início: ${aula.hora_inicio})`,
        );

        // Incrementa para a próxima aula
        proximoPkAula++;
      } catch (error: any) {
        console.error(
          `[DEV] Erro ao inserir aula com PK_AULA = ${proximoPkAula}`,
          error.message,
        );
        // Se quiser parar no primeiro erro:
        // throw error;
        // Ou continua tentando as próximas (útil em dev)
      }
    }

    // Opcional: mostra o próximo ID que seria usado na próxima execução
    console.log(`[DEV] Próximo PK_AULA disponível: ${proximoPkAula}`);
    const message = horarioIdParam
      ? 'Horário atualizado com sucesso!'
      : 'Horário criado com sucesso!';

    return { success: true, message, horarioId };
  }
  // 3) Buscar grade curricular (confirma existência)
  async getGradeCurricular(codigoUnidadeCurricular: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT codigo
     FROM fk2_tb_grade_curricular
     WHERE CODIGO = :codigoUnidadeCurricular`,
      [codigoUnidadeCurricular],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Grade curricular não encontrada para o código ${codigoUnidadeCurricular}`,
      );
    }

    return result[0].CODIGO as number;
  }
  // 4.1) Descrição da disciplina da grade curricular
  async getDescricaoGradeCurricular(codigoGrade: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT d.designacao
     FROM fk2_tb_grade_curricular gc
     INNER JOIN fk2_tb_disciplinas d ON gc.CODIGO_DISCIPLINA = d.codigo
     WHERE gc.codigo = :codigoGrade`,
      [codigoGrade],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Descrição da grade curricular não encontrada para o código ${codigoGrade}`,
      );
    }

    return result[0].DESIGNACAO as string;
  }

  // 4.2) Descrição do período
  async getDescricaoPeriodo(codigoPeriodo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM fk2_tb_periodos
     WHERE codigo = :codigoPeriodo`,
      [codigoPeriodo],
    );

    if (!result || result.length === 0) {
      throw new Error(`Período não encontrado para o código ${codigoPeriodo}`);
    }

    return result[0].DESIGNACAO as string;
  }

  // 4.3) Nome do docente
  async getNomeDocente(codigoDocente: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT nome
     FROM fk2_tb_docente
     WHERE CODIGO = :codigoDocente`,
      [codigoDocente],
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${codigoDocente}`);
    }

    return result[0].NOME as string;
  }

  // 4.4) Descrição do ano lectivo
  async getDescricaoAnoLectivo(codigoAnoLectivo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM FK2_TB_ANO_LECTIVO
     WHERE CODIGO = :codigoAnoLectivo`,
      [codigoAnoLectivo],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Ano lectivo não encontrado para o código ${codigoAnoLectivo}`,
      );
    }

    return result[0].DESIGNACAO as string;
  }
  //
  private async getDescricaoSala(sala: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM FK2_TB_SALAS
     WHERE CODIGO = :sala`,
      [sala],
    );

    if (!result || result.length === 0) {
      throw new Error(`Sala não encontrado para o código ${sala}`);
    }

    return result[0].DESIGNACAO as string;
  }
  private async getschedule(cheduleId: number): Promise<any> {
    return await this.dataSource.query(
      `
    SELECT DISTINCT
      h."PK_HORARIO"                                            AS "CODIGO",
      h."DESIGNACAO"                                            AS "DESIGNACAO",
      h."CAPACIDADE"                                            AS "CAPACIDADE",
        NVL(alu."TOTAL_ALUNOS", 0)                                AS "TOTAL_ALUNOS"
    FROM "FK2_MGH_TB_HORARIO" h
   INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
    ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
  LEFT JOIN (
    SELECT
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER) AS "HORARIO_ID",
        COUNT(*) AS "TOTAL_ALUNOS"
    FROM "FK2_TB_GRADE_CURRICULAR_ALUNO"
     GROUP BY
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER)
) alu
    ON alu."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
   AND alu."HORARIO_ID" = h."PK_HORARIO"
    WHERE h."PK_HORARIO" = :cheduleId

  `,
      [cheduleId],
    );
  }
  private async promptToCreateAndEditSchedule(
    tipo_prazo: number,
    ano_lectivo: number,
  ): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT DATA_INICIO,DATA_FIM,PK_PRAZO,OBSERVACAO,FK_TIPO_PRAZO
     FROM FK2_MCAL_TB_PRAZO
     WHERE FK_TIPO_PRAZO = :tipo_prazo
     AND FK_ANO_LECTIVO = :ano_lectivo`,
      { tipo_prazo, ano_lectivo } as any,
    );
    return result[0];
  }
  private async loopholeToEditSchedule(scheduleId: number): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT DATA_INICIO,DATA_FIM,PK_PERMISAO_EDICAO_HORARIO
     FROM FK2_MGH_TB_PERMISAO_EDICAO_HORARIO
     WHERE FK_HORARIO = :scheduleId
     AND ATIVE_STATE = 1`,
      { scheduleId } as any,
    );
    return result[0];
  }

  private async getUser(userId: number) {
    const query = `
SELECT
        -- Dados pessoais
        td.CODIGO                         AS codigo_docente,
        tu.EMAIL                          AS email,
        tu.USERNAME                       AS username,
        tu.nome                           AS nome,
        pe.NOME_DO_PAI                    AS nome_pai,
        pe.NOME_DA_MAE                    AS nome_mae,
        pe.DATA_DE_NASCIMENTO             AS data_nascimento,
        pe.NUM_DOC_IDENTIFICACAO          AS numero_documento,
        pe.DATA_DE_EMISSAO_DOCUMENTO      AS data_emissao,
        pe.ENDERECO                       AS endereco,
        pe.TELEFONE1                      AS contacto_1,
        pe.TELEFONE2                      AS contacto_2,

        -- Dados do Docente
        td.N_MECANOGRAFICO                AS n_mecanografico,
        td.FK_ESCALAO                     AS codigo_escalao,
        td.DATAINICIODOCENCIA                     AS data_inicio_docente,
        td.TB_CATEGORIA_DOCENTE           AS codigo_categoria,
        cd.DESIGNACAO                     AS descricao_categoria,
        ed.DESIGNACAO                     AS escalao,
        ga.DESIGNACAO                     AS descricao_grau_academico,
        fa.DESIGNACAO                     AS faculdade_designacao
FROM FK2_MCA_TB_UTILIZADOR         tu
LEFT JOIN FK2_MGD_TB_DOCENTE       td  ON json_value(td.CODIGO_UTILIZADOR,'$.pk') = tu.PK_UTILIZADOR
LEFT JOIN FK2_TB_ESCALAO_DOCENTE   ed  ON ed.codigo = td.FK_ESCALAO
LEFT JOIN FK2_TB_CATEGORIA_DOCENTE cd  ON cd.codigo = td.TB_CATEGORIA_DOCENTE
LEFT JOIN FK2_MGD_TB_CANDIDATURA   ccc ON ccc.codigo = td.FK_CANDIDATURA
LEFT JOIN FK2_TB_GRAU_ACADEMICO    ga  ON ga.codigo = ccc.GRAU_ACADEMICO
LEFT JOIN FK2_TB_PESSOA            pe  ON pe.pk_pessoa = json_value(tu.REF_PESSOA,'$.pk')
LEFT JOIN FK2_TB_FACULDADE         fa  ON fa.codigo = td.faculdade
WHERE tu.PK_UTILIZADOR = :1
`;
    const userData = toLowerCaseKeys(
      await this.dataSource.query(query, [userId]),
    );

    return userData[0];
  }
}
