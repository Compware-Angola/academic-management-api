import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindPostGraduationAttendanceScheduleDto } from './dto/find-attendance-schedule.dto';
import { FindPostGraduationAttendanceTestDto } from './dto/find-attendance-test.dto';
import { FindPostGraduationAttendanceControlDto } from './dto/find-attendance-control.dto';
import { MarkPostGraduationAttendanceDto } from './dto/mark-attendance.dto';
import { FindPostGraduationAttendanceTeachersDto } from './dto/find-attendance-teachers.dto';
import {
  addDays,
  parseISODateOrToday,
  startOfMonth,
  startOfNextMonth,
  startOfWeekMonday,
  toISODate,
} from '../../common/helpers/parseISODateOrToday';
import { FindPostGraduationTeacherAttendanceCalendarDto } from './dto/find-teacher-attendance-calendar.dto';
import { FindPostGraduationTeacherClassCalendarDto } from './dto/find-teacher-class-calendar.dto';
import { FindPostGraduationTeacherAttendanceStatisticsDto } from './dto/find-teacher-attendance-statistics.dto';

type QueryParams = Record<string, number | string | Date | undefined>;

/**
 * Centraliza os fluxos de assiduidade da Pos-Graduacao.
 *
 * A separacao por Pos-Graduacao nao nasce do docente em si, porque um docente
 * pode atuar em mais de um grau. A separacao e feita pelo caminho academico:
 * aula/prova -> horario -> grade curricular -> curso -> tipo de candidatura.
 */
@Injectable()
export class PostGraduationAttendanceService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lista docentes que possuem atividade real no contexto de Pos-Graduacao.
   *
   * A regra evita classificar o docente como "de Pos" de forma fixa. O docente
   * entra na lista quando aparece em aulas ou como vigilante de provas ligadas a
   * cursos de Mestrado/Doutoramento.
   */
  async findTeachers(filters: FindPostGraduationAttendanceTeachersDto) {
    const { degreeId = 0, anoLectivo = 0, semestre = 0, search } = filters;
    const params: QueryParams = {};
    const academicConditions: string[] = [
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
      'GC.STATUS_ = 1',
    ];
    const teacherConditions: string[] = [];

    if (degreeId !== 0) {
      academicConditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (anoLectivo !== 0) {
      academicConditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      academicConditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (search) {
      teacherConditions.push(`
        (
          FN_REMOVE_ACENTOS(UPPER(TU.NOME)) LIKE '%' || FN_REMOVE_ACENTOS(UPPER(:search)) || '%'
          OR UPPER(TU.EMAIL) LIKE UPPER('%' || :search || '%')
          OR UPPER(TU.USERNAME) LIKE UPPER('%' || :search || '%')
          OR UPPER(TD.N_MECANOGRAFICO) LIKE UPPER('%' || :search || '%')
        )
      `);
      params.search = search;
    }

    const academicWhere = academicConditions.join(' AND ');
    const teacherWhere = teacherConditions.length
      ? `AND ${teacherConditions.join(' AND ')}`
      : '';

    const rows = await this.dataSource.query(
      `
      SELECT
        TD.CODIGO AS CODIGO,
        TU.PK_UTILIZADOR AS CODIGO_UTILIZADOR,
        TU.EMAIL AS EMAIL,
        TU.USERNAME AS USERNAME,
        TU.NOME AS NOME,
        TD.N_MECANOGRAFICO AS N_MECANOGRAFICO,
        TD.FK_ESCALAO AS CODIGO_ESCALAO,
        TD.TB_CATEGORIA_DOCENTE AS CODIGO_CATEGORIA,
        NVL(CD.DESIGNACAO, '-') AS DESCRICAO_CATEGORIA,
        NVL(ED.DESIGNACAO, '-') AS DESCRICAO_ESCALAO,
        NVL(GA.DESIGNACAO, '-') AS DESCRICAO_GRAU_ACADEMICO
      FROM FK2_MGD_TB_DOCENTE TD
      INNER JOIN FK2_MCA_TB_UTILIZADOR TU
        ON JSON_VALUE(
          TD.CODIGO_UTILIZADOR,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        ) = TU.PK_UTILIZADOR
      LEFT JOIN FK2_TB_ESCALAO_DOCENTE ED
        ON ED.CODIGO = TD.FK_ESCALAO
      LEFT JOIN FK2_TB_CATEGORIA_DOCENTE CD
        ON CD.CODIGO = TD.TB_CATEGORIA_DOCENTE
      LEFT JOIN FK2_MGD_TB_CANDIDATURA CCC
        ON CCC.CODIGO = TD.FK_CANDIDATURA
      LEFT JOIN FK2_TB_GRAU_ACADEMICO GA
        ON GA.CODIGO = CCC.GRAU_ACADEMICO
      WHERE TD.CODIGO IN (
        -- Docentes que aparecem em aulas cujo horario pertence a cursos de Pos.
        SELECT DISTINCT
          JSON_VALUE(
            A.REF_DOCENTE,
            '$.pkDocente' RETURNING NUMBER NULL ON ERROR
          ) AS CODIGO_DOCENTE
        FROM FK2_MGH_TB_AULA A
        INNER JOIN FK2_MGH_TB_HORARIO H
          ON H.PK_HORARIO = A.FK_HORARIO
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        WHERE A.ACTIVE_STATE = 1
          AND H.ACTIVE_STATE = 1
          AND ${academicWhere}

        UNION

        -- Docentes que aparecem como vigilantes em provas de horarios da Pos.
        SELECT DISTINCT
          TD2.CODIGO AS CODIGO_DOCENTE
        FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE V
        INNER JOIN FK2_TB_CALENDARIO_PROVA CP
          ON CP.CODIGO = V.CALENDARIO_PROVA
        INNER JOIN FK2_MGH_TB_HORARIO H
          ON JSON_VALUE(
            CP.REF_HORARIO,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = H.PK_HORARIO
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        INNER JOIN FK2_MGD_TB_DOCENTE TD2
          ON JSON_VALUE(
            V.REF_VIGILANTE,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = JSON_VALUE(
            TD2.CODIGO_UTILIZADOR,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          )
        WHERE H.ACTIVE_STATE = 1
          AND ${academicWhere}
      )
      ${teacherWhere}
      ORDER BY TU.NOME
      `,
      params as any,
    );

    return toLowerCaseKeys(rows);
  }

  /**
   * Lista aulas normais disponiveis para marcacao de assiduidade.
   */
  findClassSchedules(filters: FindPostGraduationAttendanceScheduleDto) {
    return this.findSchedules(filters);
  }

  /**
   * Lista aulas de campo usando a mesma regra base, mas restringindo pelo tipo
   * de aula identificado pela sigla "adc".
   */
  findFieldClassSchedules(filters: FindPostGraduationAttendanceScheduleDto) {
    return this.findSchedules(filters, 'adc');
  }

  /**
   * Atualiza o estado de assiduidade de uma aula.
   *
   * O EXISTS garante que o agendamento pertence realmente a um contexto activo
   * de Pos-Graduacao antes de permitir a alteracao.
   */
  async markClassAttendance(
    dto: MarkPostGraduationAttendanceDto,
  ): Promise<{ message: string }> {
    const result = await this.dataSource.query(
      `
      UPDATE FK2_MSA_TB_AGENDAMENTO_AULA AA
      SET
        AA.FK_ESTADO_AGENDAMENTO = :novoEstado,
        AA.UPDATED_AT = SYSDATE
      WHERE AA.PK_AGENDAMENTO_AULA = :codigoAgendamento
        AND EXISTS (
          -- Protecao de escopo: so altera aulas ligadas a cursos de Pos.
          SELECT 1
          FROM FK2_MGH_TB_AULA A
          INNER JOIN FK2_MGH_TB_HORARIO H
            ON A.FK_HORARIO = H.PK_HORARIO
          INNER JOIN FK2_TB_GRADE_CURRICULAR GC
            ON GC.CODIGO = AA.FK_GRADE_CURRICULAR
          INNER JOIN FK2_TB_CURSOS C
            ON C.CODIGO = GC.CODIGO_CURSO
          WHERE A.PK_AULA = JSON_VALUE(
            AA.REF_AULA,
            '$.pkAula' RETURNING NUMBER NULL ON ERROR
          )
            AND H.ACTIVE_STATE = 1
            AND GC.STATUS_ = 1
            AND C.STATUS_ = 1
            AND C.TIPO_CANDIDATURA IN (2, 3)
        )
      `,
      {
        codigoAgendamento: dto.codigoAgendamento,
        novoEstado: dto.novoEstado,
      } as any,
    );

    if (result?.rowsAffected === 0 || result?.affected === 0) {
      throw new BadRequestException(
        'Agendamento de aula de Pos-Graduacao nao encontrado',
      );
    }

    return { message: 'Estado do agendamento atualizado com sucesso.' };
  }

  /**
   * Lista provas em que docentes atuam como vigilantes no contexto de
   * Pos-Graduacao. Este fluxo alimenta a marcacao de presenca em provas.
   */
  async findTestSchedules(filters: FindPostGraduationAttendanceTestDto) {
    const {
      docente = 0,
      disciplina = 0,
      estado = 0,
      anoLectivo = 0,
      periodoId = 0,
      semestre = 0,
      degreeId = 0,
      dataInicio,
      dataFim,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: QueryParams = { dataInicio, dataFim };
    const conditions = [
      'CP.DATA_PROVA BETWEEN :dataInicio AND :dataFim',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
      'GC.STATUS_ = 1',
    ];

    if (docente !== 0) {
      // A tabela de vigilantes guarda o utilizador no JSON; por isso convertemos
      // primeiro o codigo do docente para o codigo do utilizador associado.
      const [teacher] = await this.dataSource.query(
        `
        SELECT JSON_VALUE(CODIGO_UTILIZADOR, '$.pk' RETURNING NUMBER NULL ON ERROR) AS UTILIZADOR
        FROM FK2_MGD_TB_DOCENTE
        WHERE CODIGO = :docente
        FETCH FIRST 1 ROWS ONLY
        `,
        { docente } as any,
      );

      if (teacher?.UTILIZADOR) {
        conditions.push(
          "JSON_VALUE(V.REF_VIGILANTE, '$.pk' RETURNING NUMBER NULL ON ERROR) = :utilizadorId",
        );
        params.utilizadorId = Number(teacher.UTILIZADOR);
      } else {
        conditions.push('1 = 0');
      }
    }

    if (disciplina !== 0) {
      conditions.push('D.CODIGO = :disciplina');
      params.disciplina = disciplina;
    }

    if (periodoId !== 0) {
      conditions.push('H.FK_PERIODO = :periodoId');
      params.periodoId = periodoId;
    }

    if (estado !== 0) {
      conditions.push('V.ESTADO_AGENDAMENTO = :estado');
      params.estado = estado;
    }

    if (anoLectivo !== 0) {
      conditions.push(
        "JSON_VALUE(CP.REF_PRAZO, '$.pk_anoLectivo' RETURNING NUMBER NULL ON ERROR) = :anoLectivo",
      );
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push(
        "JSON_VALUE(CP.REF_PRAZO, '$.pk_semestre' RETURNING NUMBER NULL ON ERROR) = :semestre",
      );
      params.semestre = semestre;
    }

    if (degreeId !== 0) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    const fromClause = `
      -- Cadeia da prova ate ao curso:
      -- vigilante -> calendario de prova -> horario -> grade -> curso.
      FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE V
      LEFT JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO AP
        ON AP.PK_ESTADO_AGENDAMENTO = V.ESTADO_AGENDAMENTO
      INNER JOIN FK2_TB_CALENDARIO_PROVA CP
        ON CP.CODIGO = V.CALENDARIO_PROVA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON JSON_VALUE(CP.REF_HORARIO, '$.pk' RETURNING NUMBER NULL ON ERROR) = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = CP.CODIGO_DISCIPLINA
      LEFT JOIN FK2_TB_ANO_LECTIVO AL
        ON JSON_VALUE(CP.REF_PRAZO, '$.pk_anoLectivo' RETURNING NUMBER NULL ON ERROR) = AL.CODIGO
    `;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [records, countResult] = await Promise.all([
      this.dataSource.query(
        `
        SELECT DISTINCT
          V.CODIGO,
          TO_CHAR(CP.DATA_PROVA, 'YYYY-MM-DD') AS DATA_PROVA,
          D.DESIGNACAO AS DISCIPLINA,
          AP.DESIGNACAO AS ESTADO,
          V.ESTADO_AGENDAMENTO AS ESTADO_AGENDAMENTOID,
          JSON_VALUE(CP.REF_PRAZO, '$.pk_anoLectivo') AS ANO_LECTIVO,
          AL.DESIGNACAO AS ANO_LECTIVO_DESIGNACAO,
          JSON_VALUE(CP.REF_PRAZO, '$.pk_semestre') AS SEMESTRE,
          TO_CHAR(CP.HORA_PROVA, 'HH24:MI') AS HORA_PROVA,
          TO_CHAR(CP.HORA_TERMINO, 'HH24:MI') AS HORA_TERMINO,
          TO_CHAR(CP.DURACAOPROVA, 'HH24:MI') AS DURACAO_PROVA,
          JSON_VALUE(V.REF_VIGILANTE, '$.desc') AS DOCENTE_NOME
        ${fromClause}
        ${whereClause}
        ORDER BY DATA_PROVA ASC, CODIGO ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),
      this.dataSource.query(
        `
        SELECT COUNT(DISTINCT V.CODIGO) AS TOTAL
        ${fromClause}
        ${whereClause}
        `,
        params as any,
      ),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(records),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Atualiza o estado de presenca do vigilante numa prova de Pos-Graduacao.
   *
   * A validacao por EXISTS impede que uma chamada desta rota altere prova fora
   * do escopo de Mestrado/Doutoramento.
   */
  async markTestAttendance(
    dto: MarkPostGraduationAttendanceDto,
  ): Promise<{ message: string }> {
    const result = await this.dataSource.query(
      `
      UPDATE FK2_TB_CALENDARIO_PROVA_VIGILANTE V
      SET V.ESTADO_AGENDAMENTO = :novoEstado
      WHERE V.CODIGO = :codigoAgendamento
        AND EXISTS (
          -- Confirma que a prova pertence a horario/grade/curso de Pos.
          SELECT 1
          FROM FK2_TB_CALENDARIO_PROVA CP
          INNER JOIN FK2_MGH_TB_HORARIO H
            ON JSON_VALUE(CP.REF_HORARIO, '$.pk' RETURNING NUMBER NULL ON ERROR) = H.PK_HORARIO
          INNER JOIN FK2_TB_GRADE_CURRICULAR GC
            ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
          INNER JOIN FK2_TB_CURSOS C
            ON C.CODIGO = GC.CODIGO_CURSO
          WHERE CP.CODIGO = V.CALENDARIO_PROVA
            AND GC.STATUS_ = 1
            AND C.STATUS_ = 1
            AND C.TIPO_CANDIDATURA IN (2, 3)
        )
      `,
      {
        codigoAgendamento: dto.codigoAgendamento,
        novoEstado: dto.novoEstado,
      } as any,
    );

    if (result?.rowsAffected === 0 || result?.affected === 0) {
      throw new BadRequestException(
        'Agendamento de prova de Pos-Graduacao nao encontrado',
      );
    }

    return { message: 'Estado do agendamento de prova atualizado com sucesso.' };
  }

  /**
   * Devolve os estados usados pelo fluxo de assiduidade.
   *
   * Exemplo de uso funcional: pendente, falta e presenca marcada.
   */
  async getStatus() {
    const status = await this.dataSource.query(`
      SELECT
        PK_ESTADO_AGENDAMENTO AS CODIGO,
        DESIGNACAO AS DESIGNACAO
      FROM FK2_MSA_TB_ESTADO_AGENDAMENTO
      ORDER BY PK_ESTADO_AGENDAMENTO
    `);

    return toLowerCaseKeys(status);
  }

  /**
   * Consulta a tela de controle de assiduidade da Pos-Graduacao.
   *
   * Este metodo mostra aulas agendadas, estado da marcacao e um resumo agregado
   * para o periodo filtrado.
   */
  async findControl(filters: FindPostGraduationAttendanceControlDto) {
    const {
      docente = 0,
      dataInicial,
      dataFinal,
      estado = 0,
      anoLectivo = 0,
      semestre = 0,
      curso = 0,
      gradeCurricular = 0,
      degreeId = 0,
      page = 1,
      limit = 20,
      search = '',
    } = filters;

    const offset = (page - 1) * limit;
    const params: QueryParams = { dataInicial, dataFinal };
    const conditions = [
      'AA.ACTIVE_STATE = 1',
      'AA.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
      'H.ACTIVE_STATE = 1',
      'GC.STATUS_ = 1',
      'C2.STATUS_ = 1',
      'C2.TIPO_CANDIDATURA IN (2, 3)',
    ];

    if (docente !== 0) {
      conditions.push('AA.FK_DOCENTE = :docente');
      params.docente = docente;
    }

    if (estado !== 0) {
      conditions.push('AA.FK_ESTADO_AGENDAMENTO = :estado');
      params.estado = estado;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('GC.CODIGO_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (curso !== 0) {
      conditions.push('C2.CODIGO = :curso');
      params.curso = curso;
    }

    if (gradeCurricular !== 0) {
      conditions.push('GC.CODIGO = :gradeCurricular');
      params.gradeCurricular = gradeCurricular;
    }

    if (degreeId !== 0) {
      conditions.push('C2.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (search) {
      conditions.push(`
        (
          CAST(AA.PK_AGENDAMENTO_AULA AS VARCHAR2(50)) LIKE :search
          OR UPPER(JSON_VALUE(AL.REF_DOCENTE, '$.nome')) LIKE UPPER(:search)
          OR UPPER(D.DESIGNACAO) LIKE UPPER(:search)
          OR UPPER(C2.DESIGNACAO) LIKE UPPER(:search)
        )
      `);
      params.search = `%${search}%`;
    }

    const fromClause = `
      -- Cadeia principal do controle:
      -- agendamento -> aula -> horario -> grade -> curso.
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON TO_NUMBER(AA.FK_AULA) = AL.PK_AULA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON TO_NUMBER(AA.FK_GRADE_CURRICULAR) = GC.CODIGO
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON GC.CODIGO_DISCIPLINA = D.CODIGO
      LEFT JOIN FK2_TB_CURSOS C2
        ON GC.CODIGO_CURSO = C2.CODIGO
    `;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [records, countResult, summaryResult] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          AA.PK_AGENDAMENTO_AULA AS CODIGO,
          C2.DESIGNACAO AS CURSO,
          D.DESIGNACAO AS UNIDADE_CURRICULAR,
          AL.ORDEM AS ORDEM_TEMPO,
          TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
          TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
          TO_CHAR(AA.DATA_AULA, 'YYYY-MM-DD') AS DATA_AULA,
          AA.FK_ESTADO_AGENDAMENTO AS ESTADO_AGENDAMENTO,
          EST.DESIGNACAO AS ESTADO_AGENDAMENTO_DESIGNACAO,
          JSON_VALUE(AL.REF_DOCENTE, '$.nome') AS DOCENTE
        ${fromClause}
        ${whereClause}
        ORDER BY DATA_AULA ASC, CODIGO ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),
      this.dataSource.query(
        `
        -- Conta todos os agendamentos encontrados com os mesmos filtros.
        SELECT COUNT(*) AS TOTAL
        ${fromClause}
        ${whereClause}
        `,
        params as any,
      ),
      this.dataSource.query(
        `
        -- Resume os estados para alimentar os totais da tela de controle.
        SELECT
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS MARCACOES_PENDENTES,
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS FALTAS_MARCADAS,
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS PRESENCAS_MARCADAS
        ${fromClause}
        ${whereClause}
        `,
        params as any,
      ),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(records),
      resumo: {
        marcacoesPendentes: Number(
          summaryResult?.[0]?.MARCACOES_PENDENTES ?? 0,
        ),
        faltasMarcadas: Number(summaryResult?.[0]?.FALTAS_MARCADAS ?? 0),
        presencasMarcadas: Number(
          summaryResult?.[0]?.PRESENCAS_MARCADAS ?? 0,
        ),
      },
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Monta o calendario geral de assiduidade de um docente.
   *
   * O mesmo endpoint suporta visao mensal, semanal e diaria. A diferenca entre
   * as visoes e o intervalo calculado a partir da data de referencia.
   */
  async findTeacherGeneralCalendar(
    filters: FindPostGraduationTeacherAttendanceCalendarDto,
  ) {
    const docenteIdNum = filters.docenteId ? Number(filters.docenteId) : 0;
    const {
      degreeId = 0,
      docenteNome = '',
      modo,
    } = filters;
    const refDate = parseISODateOrToday(filters.dataReferencia);

    if (!modo) {
      throw new BadGatewayException(
        'Parâmetro "modo" é obrigatório: MES | SEMANA | DIA',
      );
    }

    // Define o intervalo real consultado no banco conforme a visao selecionada.
    let inicio: Date;
    let fim: Date;

    if (modo === 'MES') {
      inicio = startOfMonth(refDate);
      fim = startOfNextMonth(refDate);
    } else if (modo === 'SEMANA') {
      inicio = startOfWeekMonday(refDate);
      fim = addDays(inicio, 7);
    } else {
      inicio = new Date(
        refDate.getFullYear(),
        refDate.getMonth(),
        refDate.getDate(),
      );
      fim = addDays(inicio, 1);
    }

    const conditions: string[] = [
      'AA.ACTIVE_STATE = 1',
      'AA.FK_ESTADO_AGENDAMENTO IN (1, 2, 3)',
      'AA.DATA_AULA >= :inicio AND AA.DATA_AULA < :fim',
      'H.ACTIVE_STATE = 1',
      'NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4',
      'GC.STATUS_ = 1',
      'C.STATUS_ = 1',
      'C.TIPO_CANDIDATURA IN (2, 3)',
    ];

    const params: QueryParams = { inicio, fim };

    if (degreeId !== 0) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (docenteIdNum && docenteIdNum !== 0) {
      conditions.push('AA.FK_DOCENTE = :docenteId');
      params.docenteId = docenteIdNum;
    } else if (docenteNome && docenteNome.trim().length > 0) {
      conditions.push(`JSON_VALUE(AL.REF_DOCENTE, '$.nome') = :docenteNome`);
      params.docenteNome = docenteNome.trim();
    } else {
      throw new BadGatewayException('Informe "docenteId" ou "docenteNome".');
    }

    const fromClause = `
      -- Calendario do docente baseado em agendamentos de aulas de Pos.
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON TO_NUMBER(AA.FK_AULA) = AL.PK_AULA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
    `;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    if (modo === 'MES') {
      const rows = await this.dataSource.query(
        `
        -- Na visao mensal agrupamos por dia para pintar o calendario.
        SELECT
          TO_CHAR(TRUNC(AA.DATA_AULA), 'YYYY-MM-DD') AS DIA,
          COUNT(*) AS TOTAL_AULAS,
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS PENDENTES,
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS FALTAS,
          SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS PRESENCAS
        ${fromClause}
        ${whereClause}
        GROUP BY TRUNC(AA.DATA_AULA)
        ORDER BY TRUNC(AA.DATA_AULA)
        `,
        params as any,
      );

      const data = toLowerCaseKeys(rows).map((row: any) => {
        const pendentes = Number(row.pendentes || 0);
        const faltas = Number(row.faltas || 0);
        const presencas = Number(row.presencas || 0);
        let statusDoDia: 'FALTA' | 'PENDENTE' | 'PRESENCA' | 'SEM_DADOS' =
          'SEM_DADOS';

        // Prioridade visual do dia: falta > pendente > presenca.
        if (faltas > 0) statusDoDia = 'FALTA';
        else if (pendentes > 0) statusDoDia = 'PENDENTE';
        else if (presencas > 0) statusDoDia = 'PRESENCA';

        return { ...row, statusDoDia };
      });

      return {
        modo,
        intervalo: {
          inicio: toISODate(inicio),
          fim: toISODate(addDays(fim, -1)),
        },
        data,
      };
    }

    const rows = await this.dataSource.query(
      `
      -- Nas visoes semanal/diaria devolvemos cada aula individualmente.
      SELECT
        AA.PK_AGENDAMENTO_AULA AS CODIGO,
        TO_CHAR(TRUNC(AA.DATA_AULA), 'YYYY-MM-DD') AS DIA,
        TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
        TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
        AA.FK_ESTADO_AGENDAMENTO AS ESTADO,
        AL.ORDEM AS ORDEM_TEMPO
      ${fromClause}
      ${whereClause}
      ORDER BY TRUNC(AA.DATA_AULA), AL.HORA_INICIO
      `,
      params as any,
    );

    return {
      modo,
      intervalo: {
        inicio: toISODate(inicio),
        fim: toISODate(addDays(fim, -1)),
      },
      data: toLowerCaseKeys(rows),
    };
  }

  /**
   * Lista os eventos de aula de um docente em formato adequado para calendario.
   *
   * Alem dos dados academicos, o metodo monta inicio, fim e cor do evento para
   * a interface conseguir desenhar o calendario sem recalcular a regra.
   */
  async findTeacherClassCalendar(
    filters: FindPostGraduationTeacherClassCalendarDto,
  ) {
    const docente = Number(filters.docente);
    const dataInicial = filters.dataInicial ?? '2000-01-01';
    const dataFinal = filters.dataFinal ?? '2100-12-31';
    const { degreeId = 0 } = filters;
    const conditions = [
      'AA.ACTIVE_STATE = 1',
      'AA.DATA_AULA BETWEEN TO_DATE(:dataInicial, \'YYYY-MM-DD\') AND TO_DATE(:dataFinal, \'YYYY-MM-DD\')',
      'H.ACTIVE_STATE = 1',
      'NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4',
      'GC.STATUS_ = 1',
      'C.STATUS_ = 1',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      `(
        AA.FK_DOCENTE = :docente
        OR JSON_VALUE(
          AA.REF_AULA,
          '$.pkDocente' RETURNING NUMBER NULL ON ERROR
        ) = :docente
      )`,
    ];
    const params: QueryParams = { docente, dataInicial, dataFinal };

    if (degreeId !== 0) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    const rows = await this.dataSource.query(
      `
      -- Cada linha representa uma aula agendada do docente no intervalo pedido.
      SELECT
        AA.PK_AGENDAMENTO_AULA AS CODIGO,
        TO_CHAR(AA.DATA_AULA, 'YYYY-MM-DD') AS DATA_AULA,
        TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
        TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
        AA.FK_ESTADO_AGENDAMENTO AS ESTADO,
        EST.DESIGNACAO AS ESTADO_DESIGNACAO,
        JSON_VALUE(AA.REF_AULA, '$.designacaoGrade') AS DISCIPLINA,
        JSON_VALUE(AL.REF_DOCENTE, '$.nome') AS DOCENTE,
        JSON_VALUE(AL.REF_SALA, '$.desc') AS SALA,
        TA.DESIGNACAO AS TIPO_AULA,
        M.DESIGNACAO AS MODALIDADE
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      LEFT JOIN FK2_MGH_TB_TIPO_AULA TA
        ON AL.FK_TIPO_AULA = TA.PK_TIPO_AULA
      LEFT JOIN FK2_MGH_TB_MODALIDADE M
        ON AL.FK_MODALIDADE = M.PK_MODALIDADE
      WHERE ${conditions.join(' AND ')}
      ORDER BY AA.DATA_AULA ASC, AL.HORA_INICIO ASC
      `,
      params as any,
    );

    const data = toLowerCaseKeys(rows).map((item: any) => ({
      ...item,
      // Campos usados pelo calendario no frontend.
      start: `${item.data_aula}T${item.hora_inicio}:00`,
      end: `${item.data_aula}T${item.hora_fim}:00`,
      // Cores por estado: pendente, falta, presenca ou fallback.
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
        pendentes: data.filter((item: any) => Number(item.estado) === 1)
          .length,
        faltas: data.filter((item: any) => Number(item.estado) === 2).length,
        presencas: data.filter((item: any) => Number(item.estado) === 3)
          .length,
      },
    };
  }

  /**
   * Gera estatisticas de assiduidade por docente.
   *
   * A consulta consolida aulas previstas, presencas, faltas e totais por
   * modalidade, sempre limitada ao contexto de Pos-Graduacao.
   */
  async findTeacherAttendanceStatistics(
    filters: FindPostGraduationTeacherAttendanceStatisticsDto,
  ) {
    const {
      degreeId = 0,
      anoLectivo = 0,
      semestre = 0,
      curso = 0,
      docente = 0,
      dataInicial,
      dataFinal,
      naoCobrarFaltas = false,
      exigirPresencasConfirmadas = false,
      exigirSumariosInseridos = false,
      exigirSumariosValidos = false,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: QueryParams = {};
    const conditions: string[] = [
      'AA.ACTIVE_STATE = 1',
      'H.ACTIVE_STATE = 1',
      'GC.STATUS_ = 1',
      'C2.STATUS_ = 1',
      'C2.TIPO_CANDIDATURA IN (2, 3)',
    ];

    if (degreeId !== 0) {
      conditions.push('C2.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (search) {
      conditions.push(`
        (
          LOWER(D2.N_MECANOGRAFICO) LIKE LOWER(:search)
          OR LOWER(TU.NOME) LIKE LOWER(:search)
        )
      `);
      params.search = `%${search}%`;
    }

    if (dataInicial && dataFinal) {
      conditions.push(
        "AA.DATA_AULA BETWEEN TO_DATE(:dataInicial, 'YYYY-MM-DD') AND TO_DATE(:dataFinal, 'YYYY-MM-DD')",
      );
      params.dataInicial = dataInicial;
      params.dataFinal = dataFinal;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (curso !== 0) {
      conditions.push('GC.CODIGO_CURSO = :curso');
      params.curso = curso;
    }

    if (docente !== 0) {
      conditions.push(
        "JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = :docente",
      );
      params.docente = docente;
    }

    if (exigirSumariosInseridos) {
      conditions.push('S.PK_TB_SUMARIO IS NOT NULL');
    }

    if (exigirSumariosValidos) {
      conditions.push('S.FK_ESTADO_SUMARIO = 4');
    }

    // Alguns relatórios exigem presenca confirmada por sumario; outros aceitam
    // apenas o estado da assiduidade. A flag escolhe essa regra sem duplicar SQL.
    const presencaCondition = exigirPresencasConfirmadas
      ? `EST.PK_ESTADO_AGENDAMENTO = 3
        AND S.PK_TB_SUMARIO IS NOT NULL
        AND S.FK_ESTADO_SUMARIO = 2`
      : 'EST.PK_ESTADO_AGENDAMENTO = 3';

    // Quando a instituicao decide nao cobrar faltas, o total salarial passa a
    // considerar apenas presencas conforme a regra definida acima.
    const totalSalarialCondition = naoCobrarFaltas
      ? presencaCondition
      : 'EST.PK_ESTADO_AGENDAMENTO IN (2, 3)';

    const fromClause = `
      -- Base estatistica: agendamento -> aula -> docente -> horario -> grade -> curso.
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MGD_TB_DOCENTE D2
        ON JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = D2.CODIGO
      INNER JOIN FK2_MCA_TB_UTILIZADOR TU
        ON JSON_VALUE(D2.CODIGO_UTILIZADOR, '$.pk' RETURNING NUMBER NULL ON ERROR) = TU.PK_UTILIZADOR
      INNER JOIN FK2_TB_ESCALAO_DOCENTE ED
        ON ED.CODIGO = D2.FK_ESCALAO
      INNER JOIN FK2_TB_CATEGORIA_DOCENTE CD
        ON CD.CODIGO = D2.TB_CATEGORIA_DOCENTE
      INNER JOIN FK2_MGD_TB_CANDIDATURA CAND
        ON CAND.CODIGO = D2.FK_CANDIDATURA
      INNER JOIN FK2_TB_GRAU_ACADEMICO GA
        ON GA.CODIGO = CAND.GRAU_ACADEMICO
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_MGH_TB_MODALIDADE M
        ON M.PK_MODALIDADE = AL.FK_MODALIDADE
      INNER JOIN FK2_TB_CURSOS C2
        ON GC.CODIGO_CURSO = C2.CODIGO
      LEFT JOIN FK2_MSA_TB_SUMARIO S
        ON S.FK_AGENDAMENTO_AULA = AA.PK_AGENDAMENTO_AULA
      LEFT JOIN FK2_TB_ESTADO_SUMARIO ES
        ON S.FK_ESTADO_SUMARIO = ES.CODIGO
    `;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [records, countResult] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          D2.N_MECANOGRAFICO AS N_MECANOGRAFICO,
          TU.NOME AS NOME,
          GA.DESIGNACAO AS GRAU_ACADEMICO,
          ED.DESIGNACAO AS ESCALAO,
          CD.DESIGNACAO AS CATEGORIA,
          COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TOTAL_AULAS_PREVISTAS,
          -- Recortes por semana, mes e totais usados pelos indicadores da tela.
          COUNT(DISTINCT CASE
            WHEN TRUNC(AA.DATA_AULA, 'IW') = TRUNC(SYSDATE, 'IW')
            THEN AA.PK_AGENDAMENTO_AULA END) AS AULAS_SEMANAIS,
          COUNT(DISTINCT CASE
            WHEN TRUNC(AA.DATA_AULA, 'MM') = TRUNC(SYSDATE, 'MM')
            THEN AA.PK_AGENDAMENTO_AULA END) AS AULAS_MENSAIS,
          COUNT(DISTINCT CASE
            WHEN TO_CHAR(AA.DATA_AULA, 'MM/YYYY') = TO_CHAR(SYSDATE, 'MM/YYYY')
            THEN AA.PK_AGENDAMENTO_AULA END) AS TM,
          COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TS,
          COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TA,
          ROUND(
            -- Total de horas efetivas soma a duracao apenas quando houve presenca.
            SUM(CASE
              WHEN ${presencaCondition}
              THEN (CAST(AL.HORA_TERMINO AS DATE) - CAST(AL.HORA_INICIO AS DATE)) * 24
              ELSE 0 END
            ), 0
          ) AS TOTAL_HORAS_EFETIVAS,
          COUNT(DISTINCT CASE
            -- Total salarial pode incluir faltas ou apenas presencas, conforme filtro.
            WHEN ${totalSalarialCondition}
            THEN AA.PK_AGENDAMENTO_AULA END) AS TOTAL_HORAS_SALARIAL,
          COUNT(DISTINCT CASE
            WHEN EST.PK_ESTADO_AGENDAMENTO = 2
            THEN AA.PK_AGENDAMENTO_AULA END) AS TOTAL_FALTAS,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 1
            THEN AA.PK_AGENDAMENTO_AULA END) AS AP_TOTAL,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 1
              AND ${presencaCondition}
            THEN AA.PK_AGENDAMENTO_AULA END) AS AP_PRESENCA,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 1
              AND EST.PK_ESTADO_AGENDAMENTO = 2
              AND ${naoCobrarFaltas ? '1 = 2' : '1 = 1'}
            THEN AA.PK_AGENDAMENTO_AULA END) AS AP_FALTA,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 2
            THEN AA.PK_AGENDAMENTO_AULA END) AS AV_TOTAL,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 2
              AND ${presencaCondition}
            THEN AA.PK_AGENDAMENTO_AULA END) AS AV_PRESENCA,
          COUNT(DISTINCT CASE
            WHEN M.PK_MODALIDADE = 2
              AND EST.PK_ESTADO_AGENDAMENTO = 2
              AND ${naoCobrarFaltas ? '1 = 2' : '1 = 1'}
            THEN AA.PK_AGENDAMENTO_AULA END) AS AV_FALTA,
          COUNT(DISTINCT CASE
            WHEN ${presencaCondition}
            THEN AA.PK_AGENDAMENTO_AULA END) AS TOTAL_PRESENCAS,
          COUNT(DISTINCT CASE
            WHEN EST.PK_ESTADO_AGENDAMENTO = 2
              AND ${naoCobrarFaltas ? '1 = 2' : '1 = 1'}
            THEN AA.PK_AGENDAMENTO_AULA END) AS TOTAL_FALTAS_GERAL,
          COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TOTAL_GERAL
        ${fromClause}
        ${whereClause}
        GROUP BY
          D2.CODIGO,
          D2.N_MECANOGRAFICO,
          TU.NOME,
          GA.DESIGNACAO,
          ED.DESIGNACAO,
          CD.DESIGNACAO
        ORDER BY TU.NOME ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),
      this.dataSource.query(
        `
        SELECT COUNT(*) AS TOTAL
        FROM (
          SELECT D2.CODIGO
          ${fromClause}
          ${whereClause}
          GROUP BY D2.CODIGO
        )
        `,
        params as any,
      ),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(records),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Metodo base para listagens de aulas da marcacao de assiduidade.
   *
   * E reutilizado por aulas normais e aulas de campo para manter os mesmos
   * filtros academicos e mudar apenas o tipo de aula quando necessario.
   */
  private async findSchedules(
    filters: FindPostGraduationAttendanceScheduleDto,
    classTypeAcronym?: string,
  ) {
    const {
      docente = 0,
      unidadeCurricular = 0,
      dataInicial,
      dataFinal,
      periodoId = 0,
      estado = 0,
      anoLectivo = 0,
      semestre = 0,
      degreeId = 0,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: QueryParams = { dataInicial, dataFinal };
    const conditions = [
      'AA.ACTIVE_STATE = 1',
      'AA.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
      'H.ACTIVE_STATE = 1',
      'GC.STATUS_ = 1',
      'C2.STATUS_ = 1',
      'C2.TIPO_CANDIDATURA IN (2, 3)',
    ];

    if (classTypeAcronym) {
      conditions.push('AT.SIGLA = :classTypeAcronym');
      params.classTypeAcronym = classTypeAcronym;
    }

    if (docente !== 0) {
      conditions.push(
        "JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = :docente",
      );
      params.docente = docente;
    }

    if (periodoId !== 0) {
      conditions.push('H.FK_PERIODO = :periodoId');
      params.periodoId = periodoId;
    }

    if (unidadeCurricular !== 0) {
      conditions.push(
        "JSON_VALUE(AA.REF_AULA, '$.pkGrade' RETURNING NUMBER NULL ON ERROR) = :unidadeCurricular",
      );
      params.unidadeCurricular = unidadeCurricular;
    }

    if (estado !== 0) {
      conditions.push('AA.FK_ESTADO_AGENDAMENTO = :estado');
      params.estado = estado;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (degreeId !== 0) {
      conditions.push('C2.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    const fromClause = `
      -- Fonte das aulas marcaveis:
      -- agendamento -> aula -> horario -> grade -> curso de Pos.
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_MGH_TB_TIPO_AULA AT
        ON AT.PK_TIPO_AULA = AL.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA DS
        ON DS.PK_DIA_DA_SEMANA = AL.FK_DIA_DA_SEMANA
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON GC.CODIGO_DISCIPLINA = D.CODIGO
      LEFT JOIN FK2_TB_CURSOS C2
        ON GC.CODIGO_CURSO = C2.CODIGO
    `;
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [records, countResult] = await Promise.all([
      this.dataSource.query(
        `
        SELECT DISTINCT
          AA.PK_AGENDAMENTO_AULA AS CODIGO,
          C2.DESIGNACAO AS CURSO,
          D.DESIGNACAO AS UNIDADE_CURRICULAR,
          AT.DESIGNACAO AS TIPO_AULA,
          AL.ORDEM AS ORDEM_TEMPO,
          TO_CHAR(AA.DATA_AULA, 'YYYY-MM-DD') AS DATA_AULA,
          TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
          TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
          AA.FK_ESTADO_AGENDAMENTO AS ESTADO_AGENDAMENTO_AULA,
          EST.DESIGNACAO AS ESTADO_AGENDAMENTO_AULA_DESIGNACAO,
          DS.DESIGNACAO AS DIA_SEMANA,
          JSON_VALUE(AL.REF_DOCENTE, '$.nome') AS DOCENTE
        ${fromClause}
        ${whereClause}
        ORDER BY AA.DATA_AULA ASC, AA.PK_AGENDAMENTO_AULA ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),
      this.dataSource.query(
        `
        -- Total baseado no codigo do agendamento para evitar contagem duplicada.
        SELECT COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TOTAL
        ${fromClause}
        ${whereClause}
        `,
        params as any,
      ),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(records),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }
}
