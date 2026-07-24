import { TipoCandidaturaSigla } from './tipo_candidatura.sigla';

const GrauAcademicoSigla = {
  LICENCIADO: 'LIC',
  MESTRE: 'MST',
  DOUTOR: 'DTR',
};

const tipoParaGrauMap: Record<string, string> = {
  [TipoCandidaturaSigla.LICENCIATURA]: GrauAcademicoSigla.LICENCIADO,
  [TipoCandidaturaSigla.MESTRADO]: GrauAcademicoSigla.MESTRE,
  [TipoCandidaturaSigla.DOUTORAMENTO]: GrauAcademicoSigla.DOUTOR,
};

export function obterGrauAcademicoPorTipoCandidatura(
  tipoSigla: string,
): string | undefined {
  return tipoParaGrauMap[tipoSigla];
}
export { GrauAcademicoSigla };
