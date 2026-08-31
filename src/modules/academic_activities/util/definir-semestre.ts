export function definirSemestre(datas: {
  DATAINICIOPRIMEIROSEMESTRE?: Date | string | null;
  DATAFIMPRIMEIROSEMESTRE?: Date | string | null;
  DATAINICIOSEGUNDOSEMESTRE?: Date | string | null;
  DATAFIMSEGUNDOSEMESTRE?: Date | string | null;
}): number {
  const hoje = new Date();

  const inicio1 = datas.DATAINICIOPRIMEIROSEMESTRE ? new Date(datas.DATAINICIOPRIMEIROSEMESTRE) : null;
  const fim1 = datas.DATAFIMPRIMEIROSEMESTRE ? new Date(datas.DATAFIMPRIMEIROSEMESTRE) : null;
  const inicio2 = datas.DATAINICIOSEGUNDOSEMESTRE ? new Date(datas.DATAINICIOSEGUNDOSEMESTRE) : null;
  const fim2 = datas.DATAFIMSEGUNDOSEMESTRE ? new Date(datas.DATAFIMSEGUNDOSEMESTRE) : null;

  if (inicio1 && hoje < inicio1) {
    return 1;
  }
  if (inicio1 && fim1 && hoje >= inicio1 && hoje <= fim1) {
    return 1;
  }

  if (inicio2 && fim2 && hoje >= inicio2 && hoje <= fim2) {
    return 2;
  }

  return 2;
}