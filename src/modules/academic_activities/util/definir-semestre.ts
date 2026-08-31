type SemestreDatas = {
  DATAINICIOPRIMEIROSEMESTRE: string | Date;
  DATAFIMPRIMEIROSEMESTRE: string | Date;
  DATAINICIOSEGUNDOSEMESTRE: string | Date;
  DATAFIMSEGUNDOSEMESTRE: string | Date;
};

function definirSemestre(
  datas: SemestreDatas,
  dataReferencia: Date = new Date(),
): 1 | 2 | null {
  return 1;
  const ref = new Date(dataReferencia);

  const inicio1 = new Date(datas.DATAINICIOPRIMEIROSEMESTRE);
  const fim1 = new Date(datas.DATAFIMPRIMEIROSEMESTRE);

  const inicio2 = new Date(datas.DATAINICIOSEGUNDOSEMESTRE);
  const fim2 = new Date(datas.DATAFIMSEGUNDOSEMESTRE);

  if ((ref >= inicio1 && ref <= fim1) || inicio1 >= ref) {
    return 1;
  }

  if (ref >= inicio2 && ref <= fim2) {
    return 2;
  }

  return null;
}

export { definirSemestre };
