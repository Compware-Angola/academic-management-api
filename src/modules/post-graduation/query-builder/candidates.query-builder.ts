import { FindCandidatesDto } from '../dto/candidates.dto';
import { CandidateStatus, PaymentStatus, SortBy, SortOrder } from '../enums';

// ─── tipos ────────────────────────────────────────────────────────────────────

export interface QueryConditions {
  clauses: string[];
  params: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── ordenação ────────────────────────────────────────────────────────────────

const SORT_COLUMN: Record<SortBy, string> = {
  [SortBy.NOME]: 'tp.NOME_COMPLETO',
  [SortBy.DATA]: 'tp.DATA_PREESCRINCAO',
};

export function buildOrderClause(
  sortBy?: SortBy,
  sortOrder?: SortOrder,
): string {
  const column = sortBy ? SORT_COLUMN[sortBy] : 'tp.CODIGO';
  const direction = sortOrder ?? SortOrder.DESC;
  return `${column} ${direction}`;
}

// ─── fragmentos SQL ───────────────────────────────────────────────────────────

const PAYMENT_SUBQUERY = `
  LEFT JOIN (
    SELECT DISTINCT
      p.CODIGO_PREINSCRICAO,
      p.ANOLECTIVO,
      1 AS existe_pagamento
    FROM FK2_TB_PAGAMENTOS p
    INNER JOIN FK2_FACTURA f ON f.CODIGO = p.CODIGO_FACTURA
    WHERE f.CODIGO_DESCRICAO = 9
  ) pag
    ON pag.CODIGO_PREINSCRICAO = tp.CODIGO
   AND pag.ANOLECTIVO          = tp.ANOLECTIVO
`;

export const BASE_JOINS = `
  LEFT JOIN FK2_TB_ADMISSAO ta
    ON ta.PRE_INCRICAO = tp.CODIGO

  INNER JOIN FK2_TB_ANO_LECTIVO alu
    ON alu.CODIGO = tp.ANOLECTIVO

  INNER JOIN FK2_TB_TIPO_CANDIDATURA tc
    ON tc.ID = tp.CODIGO_TIPO_CANDIDATURA

  INNER JOIN FK2_TB_CURSOS tcurso
    ON tcurso.CODIGO = tp.CURSO_CANDIDATURA

  LEFT JOIN FK2_TB_REJEICAO_CANDIDATURA_ALUNO trca
    ON trca.FK_PREINSCRICAO = tp.CODIGO

  ${PAYMENT_SUBQUERY}
`;

// ─── mapas de condições ───────────────────────────────────────────────────────

const ESTADO_CONDITIONS: Partial<Record<CandidateStatus, string>> = {
  [CandidateStatus.ADMITIDO]: `
    ta.CODIGO IS NOT NULL
    AND trca.PK_REJEICAO_CANDIDATURA IS NULL
  `,
  [CandidateStatus.REJEITADO]: `
    trca.PK_REJEICAO_CANDIDATURA IS NOT NULL
  `,
  [CandidateStatus.PENDENTE]: `
    ta.CODIGO IS NULL
    AND trca.PK_REJEICAO_CANDIDATURA IS NULL
  `,
};

const PAGAMENTO_CONDITIONS: Partial<Record<PaymentStatus, string>> = {
  [PaymentStatus.PAGO]: `NVL(pag.existe_pagamento, 0) = 1`,
  [PaymentStatus.NAO_PAGO]: `NVL(pag.existe_pagamento, 0) = 0`,
};

// ─── builders de condições ────────────────────────────────────────────────────

function buildBaseConditions(filters: FindCandidatesDto): QueryConditions {
  const clauses: string[] = [];
  const params: Record<string, any> = {};

  clauses.push(`tp.CODIGO_TIPO_CANDIDATURA != 1`);

  if (filters.codigoTipoCandidatura && filters.codigoTipoCandidatura !== 1) {
    clauses.push(`tp.CODIGO_TIPO_CANDIDATURA = :codigoTipoCandidatura`);
    params.codigoTipoCandidatura = filters.codigoTipoCandidatura;
  }

  if (filters.codigoAnoLectivo) {
    clauses.push(`tp.ANOLECTIVO = :codigoAnoLectivo`);
    params.codigoAnoLectivo = filters.codigoAnoLectivo;
  }

  if (filters.codigoCurso) {
    clauses.push(`tcurso.CODIGO = :codigoCurso`);
    params.codigoCurso = filters.codigoCurso;
  }

  if (filters.search) {
    clauses.push(`UPPER(tp.NOME_COMPLETO) LIKE UPPER(:search)`);
    params.search = `%${filters.search}%`;
  }

  return { clauses, params };
}

export function buildWhereClause(filters: FindCandidatesDto): QueryConditions {
  const { clauses, params } = buildBaseConditions(filters);

  if (filters.estado && filters.estado !== CandidateStatus.TODOS) {
    const condition = ESTADO_CONDITIONS[filters.estado];
    if (condition) clauses.push(condition);
  }

  if (filters.pagamento && filters.pagamento !== PaymentStatus.TODOS) {
    const condition = PAGAMENTO_CONDITIONS[filters.pagamento];
    if (condition) clauses.push(condition);
  }

  return { clauses, params };
}

// ─── builders de SQL ──────────────────────────────────────────────────────────

export function buildDataQuery(
  whereClause: string,
  orderClause: string,
): string {
  return `
    SELECT
      codigo_preinscricao,
      data,
      nome_completo,
      bilhete_identidade,
      sexo,
      contactos_telefonicos,
      email,
      candidatura,
      curso_candidatura,
      estado,
      pagamento_realizado,
      ano_lectivo
    FROM (
      SELECT
        tp.CODIGO                AS codigo_preinscricao,
        tp.DATA_PREESCRINCAO     AS data,
        tp.NOME_COMPLETO         AS nome_completo,
        tp.BILHETE_IDENTIDADE    AS bilhete_identidade,
        tp.SEXO                  AS sexo,
        tp.CONTACTOS_TELEFONICOS AS contactos_telefonicos,
        tp.EMAIL                 AS email,
        tc.DESIGNACAO            AS candidatura,
        tcurso.DESIGNACAO        AS curso_candidatura,
        alu.DESIGNACAO            AS ano_lectivo,
        CASE
          WHEN trca.PK_REJEICAO_CANDIDATURA IS NOT NULL THEN 'Rejeitado'
          WHEN ta.CODIGO IS NOT NULL                    THEN 'Admitido'
          ELSE                                               'Pendente'
        END AS estado,
        NVL(pag.existe_pagamento, 0) AS pagamento_realizado,
        ROW_NUMBER() OVER (ORDER BY ${orderClause}) AS rn
      FROM FK2_TB_PREINSCRICAO tp
      ${BASE_JOINS}
      WHERE ${whereClause}
    )
    WHERE rn > :offset
      AND rn <= (:offset + :limit)
  `;
}

export function buildCountQuery(whereClause: string): string {
  return `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_PREINSCRICAO tp
    ${BASE_JOINS}
    WHERE ${whereClause}
  `;
}
