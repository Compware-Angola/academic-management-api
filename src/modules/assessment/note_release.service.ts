import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StudentFiltersDto } from './dto/studenty-filter.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import {
  StudentEvaluationArrayDto,
  StudentEvaluationDto,
} from './dto/student-evaluation.dto';
import { DecodedUserPayload } from '../common/types/token-validation-response.interface';
import { promptToCreateAndEditService } from '../academic_activities/prompt-to-create-and-edit.service';
import { GetStudentSummaryDto } from './dto/GetStudentSummaryDto';

@Injectable()
export class NoteReleaseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly promptToCreateAndEditService: promptToCreateAndEditService,
  ) { }

  async findstudents(filters: StudentFiltersDto) {
    let {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      classe,
      tipoAvaliacao,
      turno,
      search,
      page = 1,
      limit = 10,
    } = filters;
    search = search?.trim();

    const offset = (page - 1) * limit;
    const realLimit = limit + 1;

    let studentsFilter: any[];

    switch (tipoAvaliacao) {
      case 6:
        studentsFilter = await this.getGeneralStudentNoteRelease2Exame(
          anoLectivoId,
          horarioId,
          tipoProvaId,
          classe,
          tipoAvaliacao,
          turno,
          search,
          offset,
          realLimit,
        );
        break;

      case 7:
        studentsFilter = await this.getGeneralStudentNoteReleaseRecurso(
          anoLectivoId,
          horarioId,
          tipoProvaId,
          classe,
          tipoAvaliacao,
          turno,
          search,
          offset,
          realLimit,
        );
        break;

      default:
        studentsFilter = await this.getGeneralStudentNoteRelease(
          anoLectivoId,
          horarioId,
          tipoProvaId,
          classe,
          tipoAvaliacao,
          turno,
          search,
          offset,
          realLimit,
        );
        break;
    }

    const hasNextPage = studentsFilter.length > limit;
    if (hasNextPage) studentsFilter.pop();

    return {
      success: true,
      data: await toLowerCaseKeys(studentsFilter),
      page,
      limit,
      hasNextPage,
    };
  }
  async getStudentsSummary(filters: GetStudentSummaryDto) {
    const {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      classe,
      tipoAvaliacao,
      turno,
      search,
    } = filters;

    const baseWhere = `
   -- MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
     GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
    AND JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
    AND GCA.CODIGO_STATUS_GRADE_CURRICULAR <> 5
    AND CONF.CLASSE = :classe
    AND PRE.CODIGO_TURNO = :turno
    AND (
        :search IS NULL
        OR UPPER(PRE.NOME_COMPLETO) LIKE UPPER(:search)
        OR TO_CHAR(MAT.CODIGO) LIKE :search
    )
  `;

    const exameExtraFilter =
      tipoAvaliacao === 6
        ? `AND GCA.CODIGO NOT IN (
            SELECT TGCAA.GRADE_CURRICULAR_ALUNO
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES TGCAA
            INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO GCA2
                ON GCA2.CODIGO = TGCAA.GRADE_CURRICULAR_ALUNO
            WHERE JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
              AND TGCAA.NOTA >= 8
              AND TGCAA.TIPO_AVALIACAO = 2
        )`
        : '';

    const joinType = tipoAvaliacao === 1 ? 'LEFT' : 'INNER';

    const query = `
    SELECT
        COUNT(DISTINCT GCA.CODIGO)                                      AS total_estudantes,
        COUNT(DISTINCT CASE WHEN AVA.NOTA IS NOT NULL THEN GCA.CODIGO END) AS total_com_nota,
        COUNT(DISTINCT CASE WHEN AVA.NOTA IS NULL     THEN GCA.CODIGO END) AS total_sem_nota
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA  = :tipoProvaId
       AND AVA.TIPO_AVALIACAO = :tipoAvaliacao
    ${joinType} JOIN FK2_TB_MATRICULAS MAT  ON MAT.CODIGO  = GCA.CODIGO_MATRICULA
    ${joinType} JOIN FK2_TB_ADMISSAO ADM    ON ADM.CODIGO  = MAT.CODIGO_ALUNO
    ${joinType} JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
    ${joinType} JOIN FK2_TB_CONFIRMACOES CONF ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE ${baseWhere}
    ${exameExtraFilter}
  `;

    const result = await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno,
      search: search ? `%${search}%` : null,
    } as any);

    const row = result[0];
    return {
      success: true,
      data: {
        total_estudantes: Number(
          row.TOTAL_ESTUDANTES ?? row.total_estudantes ?? 0,
        ),
        total_com_nota: Number(row.TOTAL_COM_NOTA ?? row.total_com_nota ?? 0),
        total_sem_nota: Number(row.TOTAL_SEM_NOTA ?? row.total_sem_nota ?? 0),
      },
    };
  }
  async upsertStudentEvaluation(
    dto: StudentEvaluationArrayDto,
    user: DecodedUserPayload,
  ) {
    const { items } = dto;

    const proza =
      await this.promptToCreateAndEditService.promptToCreateAndEditGrades();

    const refUtilizador = {
      pk: user.sub,
      desc: user.name,
      corLetra: 'black',
      disponivel: true,
    };

    for (const item of items) {
      const {
        gradeCurricularAluno,
        tipoDeProva,
        tipoAvaliacao,
        utilizador,
        nota,
        epoca,
        observacao,
        status,
        notaAnterior,
        codigo_grade_avaliacao_aluno,
      } = item;
      const existing = await this.dataSource.query(
        `
  SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES
  WHERE 1=1
    --AND CODIGO = :codigo_grade_avaliacao_aluno
    AND TIPO_DE_PROVA = :tipoDeProva
    AND TIPO_AVALIACAO = :tipoAvaliacao
    AND GRADE_CURRICULAR_ALUNO = :gradeCurricularAluno
  `,
        { gradeCurricularAluno, tipoDeProva, tipoAvaliacao } as any,
      );

      if (existing.length != 0) {
        if (
          codigo_grade_avaliacao_aluno == null ||
          codigo_grade_avaliacao_aluno == undefined
        ) {
          throw new BadRequestException(
            'codigo_grade_avaliacao_aluno é undefined',
          );
        }
        // Executa UPDATE
        const updateResult = await this.dataSource.query(
          `
    UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES
    SET
      UTILIZADOR = :utilizador,
      NOTA = :nota,
      EPOCA = :epoca,
      OBSERVACAO = :observacao,
      STATUS_ = :status,
      NOTA_ANTERIOR = :notaAnterior,
      REF_UTILIZADOR = :refUtilizador,
      UPDATE_AT = SYSDATE
    WHERE CODIGO = :codigo_grade_avaliacao_aluno
      AND TIPO_DE_PROVA = :tipoDeProva
      AND TIPO_AVALIACAO = :tipoAvaliacao
    `,
          {
            codigo_grade_avaliacao_aluno,
            tipoDeProva,
            tipoAvaliacao,
            utilizador,
            nota,
            epoca,
            observacao,
            status,
            notaAnterior,
            refUtilizador: JSON.stringify(refUtilizador),
          } as any,
        );
      } else {
        // Executa INSERT

        await this.dataSource.query(
          `
  INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES (
    GRADE_CURRICULAR_ALUNO,
    UTILIZADOR,
    NOTA,
    TIPO_DE_PROVA,
    EPOCA,
    CREATED_AT,
    UPDATE_AT,
    TIPO_AVALIACAO,
    OBSERVACAO,
    STATUS_,
    NOTA_ANTERIOR,
    REF_UTILIZADOR
  ) VALUES (
    :gradeCurricularAluno,
    :utilizador,
    :nota,
    :tipoDeProva,
    :epoca,
    SYSDATE,
    SYSDATE,
    :tipoAvaliacao,
    :observacao,
    :status,
    :notaAnterior,
    :refUtilizador
  )
  `,
          {
            gradeCurricularAluno, // :gradeCurricularAluno
            utilizador, // :utilizador
            nota, // :nota
            tipoDeProva, // :tipoDeProva
            epoca, // :epoca
            tipoAvaliacao, // :tipoAvaliacao
            observacao, // :observacao
            status, // :status
            notaAnterior, // :notaAnterior
            refUtilizador: JSON.stringify(refUtilizador),
          } as any,
        );
      }
    }

    return { message: 'Avaliação inserida ou atualizada com sucesso' };
  }

  private async getGeneralStudentNoteRelease(
    anoLectivoId: number,
    horarioId: number,
    tipoProvaId: number,
    classe: number,
    tipoAvaliacao: number,
    turno: number,
    search?: string,
    offset = 0,
    limit = 11,
  ) {
    const query = `
    SELECT
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO = :tipoAvaliacao
    LEFT JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
    LEFT JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    LEFT JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
    LEFT JOIN FK2_TB_CONFIRMACOES CONF ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
      --  MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
         GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR <> 5
        AND GC.CODIGO_CLASSE = :classe
        AND PRE.CODIGO_TURNO = :turno
        AND (
            :search IS NULL
            OR UPPER(PRE.NOME_COMPLETO) LIKE UPPER(:search)
            OR TO_CHAR(MAT.CODIGO) LIKE :search
        )
    GROUP BY
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA, CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno,
      search: search ? `%${search}%` : null,
    } as any);
  }

  private async getGeneralStudentNoteReleaseRecurso(
    anoLectivoId: number,
    horarioId: number,
    tipoProvaId: number,
    classe: number,
    tipoAvaliacao: number,
    turno: number,
    search?: string,
    offset = 0,
    limit = 11,
  ) {
    const query = `
    SELECT
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO = :tipoAvaliacao
    INNER JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
      LEFT JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_CONFIRMACOES CONF ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
      --  MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
         GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR <> 5
        AND GC.CODIGO_CLASSE = :classe
        AND PRE.CODIGO_TURNO = :turno
        AND (
            :search IS NULL
            OR UPPER(PRE.NOME_COMPLETO) LIKE UPPER(:search)
            OR TO_CHAR(MAT.CODIGO) LIKE :search
        )
    GROUP BY
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA, CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno,
      search: search ? `%${search}%` : null,
    } as any);
  }

  private async getGeneralStudentNoteRelease2Exame(
    anoLectivoId: number,
    horarioId: number,
    tipoProvaId: number,
    classe: number,
    tipoAvaliacao: number,
    turno: number,
    search?: string,
    offset = 0,
    limit = 11,
  ) {
    const query = `
    SELECT
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO = :tipoAvaliacao
    INNER JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
    INNER JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_CONFIRMACOES CONF ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
       --  MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
         GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR <> 5
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
        AND GC.CODIGO_CLASSE = :classe
        AND PRE.CODIGO_TURNO = :turno
        AND (
            :search IS NULL
            OR UPPER(PRE.NOME_COMPLETO) LIKE UPPER(:search)
            OR TO_CHAR(MAT.CODIGO) LIKE :search
        )
        AND GCA.CODIGO NOT IN (
            SELECT TGCAA.GRADE_CURRICULAR_ALUNO
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES TGCAA
            INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO GCA2
                ON GCA2.CODIGO = TGCAA.GRADE_CURRICULAR_ALUNO
            WHERE JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
              AND TGCAA.NOTA >= 8
              AND TGCAA.TIPO_AVALIACAO = 2
        )
    GROUP BY
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA, CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno,
      search: search ? `%${search}%` : null,
    } as any);
  }
}
