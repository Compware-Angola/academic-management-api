import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { getAttendanceListDto } from './dto/get-attendanceList.dto';
// ---------- Tipos ----------

interface AttendanceParams {
  anoLectivo: number;
  prestacao: number;
  horarioPk: number;
  semestre: number;
  situacaoFinanceira: number;
  nome?: string | null;
  codigoMatricula?: string | number | null;
}

interface AttendanceQuery {
  sql: string; // sem OFFSET/FETCH
  binds: Record<string, any>;
}

@Injectable()
export class AttendanceListService {
  constructor(private readonly dataSource: DataSource) {}

  // ---------- 1. Resolver e validar parâmetros (compartilhado) ----------

  private async resolveAttendanceParams(
    dto: Partial<getAttendanceListDto>,
  ): Promise<AttendanceParams> {
    const {
      anoLectivo,
      horarioPk,
      semestre,
      situacao_financeira,
      nome,
      codigoMatricula,
    } = dto;

    if (!anoLectivo || !horarioPk || !semestre || !situacao_financeira) {
      throw new BadRequestException(
        'anoLectivo, situação e horarioPk são obrigatórios',
      );
    }

    const prestacao = await this.getPrestacao(anoLectivo);
    if (prestacao == null) {
      throw new BadRequestException('prestacao é obrigatória');
    }
    if (
      !dto.anoLectivo ||
      prestacao == null ||
      !dto.horarioPk ||
      !dto.situacao_financeira ||
      !dto.semestre
    ) {
      throw new BadRequestException(
        'anoLectivo, prestacao, situação e horarioPk são obrigatórios',
      );
    }

    return {
      anoLectivo,
      prestacao,
      horarioPk,
      semestre,
      situacaoFinanceira: situacao_financeira,
      nome: nome ?? null,
      codigoMatricula: codigoMatricula ?? null,
    };
  }

  // ---------- 2. Query base (compartilhado) ----------
  // Sem OFFSET/FETCH aqui de propósito: quem decide se pagina é quem chama.

  private buildAttendanceQuery(params: AttendanceParams): AttendanceQuery {
    const situacaoFilter =
      params.situacaoFinanceira === 2
        ? `is_bolseiro = 0 AND mes_pago < :prestacao`
        : `(is_bolseiro = 1 OR mes_pago >= :prestacao)`;

    const sql = `
SELECT * FROM (
  SELECT
    m.codigo AS numero_matricula,
    pre.nome_completo as nome,
    cc.designacao     as curso,
    pp.designacao     as periodo,
    cl.designacao     as classe,
    al.CODIGO_STATUS_GRADE_CURRICULAR,
    CASE WHEN b.codigo_matricula IS NOT NULL THEN 1 ELSE 0 END AS is_bolseiro,
    COALESCE(p.mes_pago, 0) AS mes_pago,
    JSON_VALUE(hr.REF_GRADE_CURRICULAR, '$.pk')   AS codigo_disciplina,
    JSON_VALUE(hr.REF_GRADE_CURRICULAR, '$.desc') AS uc,
    prova.DATA_PROVA,
    prova.HORA_PROVA,
    prova.HORA_TERMINO,
    prova.DURACAOPROVA   AS DURACAO_PROVA,
    prova.TIPO_PROVA,
    prova.TIPO_AVALIACAO
  FROM fk2_tb_grade_curricular_aluno al
  INNER JOIN fk2_tb_matriculas m ON m.codigo = al.codigo_matricula
  INNER JOIN fk2_tb_admissao ad ON ad.codigo = m.codigo_aluno
  INNER JOIN fk2_tb_preinscricao pre ON pre.codigo = ad.pre_incricao
  INNER JOIN fk2_tb_cursos cc on cc.codigo = m.codigo_curso
  INNER JOIN FK2_TB_GRADE_CURRICULAR gg on gg.codigo = al.CODIGO_GRADE_CURRICULAR
  INNER JOIN FK2_TB_CLASSES cl on cl.codigo = gg.CODIGO_CLASSE
  LEFT JOIN FK2_MGH_TB_HORARIO hr on hr.PK_HORARIO = JSON_VALUE(al.REF_HORARIO, '$.pk')
  LEFT JOIN FK2_TB_PERIODOS pp on pp.codigo = hr.FK_PERIODO
  LEFT JOIN (
    SELECT
      cp.DATA_PROVA, cp.HORA_PROVA, cp.HORA_TERMINO, cp.DURACAOPROVA,
      tp.DESIGNACAO AS TIPO_PROVA,
      JSON_VALUE(cp.REF_PRAZO, '$.tipoAvalicao') AS TIPO_AVALIACAO,
      JSON_VALUE(cp.REF_HORARIO, '$.pk' RETURNING NUMBER) AS HORARIO_PK,
      ROW_NUMBER() OVER (
        PARTITION BY JSON_VALUE(cp.REF_HORARIO, '$.pk' RETURNING NUMBER)
        ORDER BY cp.DATA_PROVA DESC, cp.CODIGO DESC
      ) AS RN
    FROM FK2_TB_CALENDARIO_PROVA cp
    LEFT JOIN FK2_TB_TIPO_PROVA tp ON tp.CODIGO = cp.CODIGO_TIPO_PROVA
    WHERE cp.ESTADO = 1
  ) prova ON prova.HORARIO_PK = hr.PK_HORARIO AND prova.RN = 1
  LEFT JOIN (
    SELECT bo.codigo_matricula, 1 AS is_bolseiro
    FROM FK2_TB_BOLSEIROS bo
    LEFT JOIN FK2_TB_BOLSAS bl ON bl.CODIGO = bo.CODIGO_BOLSA
    LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS db ON db.CODIGO = bl.CODIGO_TIPO_DESCONTO
    WHERE bo.codigo_anolectivo = :anoLectivo
      AND bo.SEMESTRE = :semestre
      AND ((bo.desconto = 0 OR bo.desconto = 100) or (bl.VALOR_DESCONTO = 100 and db.SIGLA = 'DESC_PERC'))
    GROUP BY bo.codigo_matricula
  ) b ON b.codigo_matricula = m.codigo
  LEFT JOIN (
    SELECT f.codigomatricula, COUNT(mt.id) AS mes_pago
    FROM fk2_factura f
    JOIN fk2_factura_items fi ON fi.codigofactura = f.codigo
    JOIN fk2_mes_temp mt ON mt.id = fi.mes_temp_id
    WHERE mt.ano_lectivo = :anoLectivo
      AND mt.prestacao <= :prestacao
      AND f.estado = 1
    GROUP BY f.codigomatricula
  ) p ON p.codigomatricula = m.codigo
  WHERE
    JSON_VALUE(al.REF_HORARIO, '$.pk') = :horarioPk
    AND al.CODIGO_ANO_LECTIVO = :anoLectivo
    AND al.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 4)
    AND (:nome IS NULL OR fn_remove_acentos(UPPER(pre.nome_completo)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
    AND (:codigoMatricula IS NULL OR m.codigo = :codigoMatricula)
)
WHERE ${situacaoFilter}
ORDER BY nome ASC
`;

    return {
      sql,
      binds: {
        anoLectivo: params.anoLectivo,
        semestre: params.semestre,
        horarioPk: params.horarioPk,
        prestacao: params.prestacao,
        nome: params.nome,
        codigoMatricula: params.codigoMatricula,
      },
    };
  }

  // ---------- 3. Formatar linhas (compartilhado) ----------

  private formatAttendanceRows(rows: any[]) {
    const first = rows[0];
    const prova = first
      ? {
          codigo_disciplina: first.codigo_disciplina,
          uc: first.uc,
          tipo_prova: first.tipo_prova,
          tipo_avaliacao: first.tipo_avaliacao,
          data_prova: first.data_prova,
          hora_prova: first.hora_prova,
          hora_termino: first.hora_termino,
          duracao_prova: first.duracao_prova,
        }
      : null;

    const data = rows.map(
      ({
        codigo_disciplina,
        uc,
        tipo_prova,
        tipo_avaliacao,
        data_prova,
        hora_prova,
        hora_termino,
        duracao_prova,
        ...aluno
      }) => aluno,
    );

    return { prova, data };
  }

  // ---------- 4. Caso PAGINADO (tela) ----------

  async getAttendanceList(dto: getAttendanceListDto) {
    const { page = 1, limit = 25 } = dto;
    const params = await this.resolveAttendanceParams(dto);
    const { sql, binds } = this.buildAttendanceQuery(params);

    const offset = (page - 1) * limit;
    const realLimit = limit + 1; // pede 1 a mais pra saber se tem próxima página

    const paginatedSql = `${sql}\nOFFSET :offset ROWS FETCH NEXT :realLimit ROWS ONLY`;

    const rows = await this.dataSource.query(paginatedSql, {
      ...binds,
      offset,
      realLimit,
    } as any);

    const hasNextPage = rows.length > limit;
    if (hasNextPage) rows.pop();

    const lowered = await toLowerCaseKeys(rows);
    const { prova, data } = this.formatAttendanceRows(lowered);

    return { prova, data, page, limit, hasNextPage };
  }

  // ---------- 5. Caso EXPORTAÇÃO (sem paginação) ----------

  async exportAttendanceList(
    dto: Omit<getAttendanceListDto, 'page' | 'limit'>,
  ) {
    const params = await this.resolveAttendanceParams(dto);
    const { sql, binds } = this.buildAttendanceQuery(params);

    const rows = await this.dataSource.query(sql, binds as any);

    const lowered = await toLowerCaseKeys(rows);
    const { prova, data } = this.formatAttendanceRows(lowered);

    return { prova, data };
  }

  private async getPrestacao(ano_lectivo: number) {
    const sql = `
   SELECT
      pg.DESCRICAO,
      pg.OBSERVACAO,
      mt.PRESTACAO

    FROM
      FK2_TB_PARAMETROS_GERAIS_MUTUE pg
      LEFT JOIN FK2_MES_TEMP mt
        ON pg.OBSERVACAO = mt.ID
    WHERE
      pg.ACTIVO = 1
      AND pg.CODIGO = 16

    `;
    const result = await this.dataSource.query(sql);
    return result[0].PRESTACAO;
  }
}
