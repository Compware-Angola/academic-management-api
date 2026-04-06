import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { definirSemestre } from '../academic_activities/util/definir-semestre';

export async function calcularSemestreByAnoLectivo(
  dataSource: DataSource,
  anoLectivo: number,
) {
  const sqlAnoLectivo = `
        SELECT
          DESIGNACAO,
          DATAINICIOPRIMEIROSEMESTRE,
          DATAFIMPRIMEIROSEMESTRE,
          DATAINICIOSEGUNDOSEMESTRE,
          DATAINICIOSEGUNDOSEMESTRE,
          DATAFIMSEGUNDOSEMESTRE,
          CODIGO
        FROM FK2_TB_ANO_LECTIVO WHERE CODIGO  = :anoLectivo
      `;

  const resultAnoLectivo = await dataSource.query(sqlAnoLectivo, {
    anoLectivo,
  } as any);
  const rowAnoLectivo = resultAnoLectivo[0];
  if (!rowAnoLectivo) {
    throw new BadRequestException('AnoLectivo não encontrado: ');
  }
  const semestre = definirSemestre({
    DATAINICIOPRIMEIROSEMESTRE: rowAnoLectivo?.DATAINICIOPRIMEIROSEMESTRE,
    DATAFIMPRIMEIROSEMESTRE: rowAnoLectivo?.DATAFIMPRIMEIROSEMESTRE,
    DATAFIMSEGUNDOSEMESTRE: rowAnoLectivo?.DATAFIMSEGUNDOSEMESTRE,
    DATAINICIOSEGUNDOSEMESTRE: rowAnoLectivo?.DATAINICIOSEGUNDOSEMESTRE,
  });
  return semestre;
}
