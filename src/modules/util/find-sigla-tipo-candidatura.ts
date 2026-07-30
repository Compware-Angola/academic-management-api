import { DataSource } from 'typeorm';

export async function findSiglaTipoCandidatura(
  dataSource: DataSource,
  tipoCandidatura: number,
): Promise<string | null> {
  const sql = `
    SELECT SIGLA
    FROM FK2_TB_TIPO_CANDIDATURA
    WHERE ID = :tipoCandidatura
  `;

  const result = await dataSource.query(sql, {
    tipoCandidatura,
  } as any);

  if (!result || result.length === 0) {
    return null;
  }

  return result[0]?.SIGLA ?? null;
}
