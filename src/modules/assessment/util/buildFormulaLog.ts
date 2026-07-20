// utils/buildFormulaLog.ts
export function buildFormulaLog(
  user: { nome?: string } | undefined,
  body: {
    codigo: string;
    notaMinPratica?: number;
    notaMinPrimeiraFreq?: number;
    notaMinSegundaFreq?: number;
    pesoPratica?: number;
    pesoPrimeiraFreq?: number;
    pesoSegundaFreq?: number;
  }
) {
  const partesMin: string[] = [];
  const partesPeso: string[] = [];

  if (body.notaMinPratica !== undefined)
    partesMin.push(`P=${body.notaMinPratica}`);

  if (body.notaMinPrimeiraFreq !== undefined)
    partesMin.push(`1F=${body.notaMinPrimeiraFreq}`);

  if (body.notaMinSegundaFreq !== undefined)
    partesMin.push(`2F=${body.notaMinSegundaFreq}`);

  if (body.pesoPratica !== undefined)
    partesPeso.push(`P=${body.pesoPratica}`);

  if (body.pesoPrimeiraFreq !== undefined)
    partesPeso.push(`1F=${body.pesoPrimeiraFreq}`);

  if (body.pesoSegundaFreq !== undefined)
    partesPeso.push(`2F=${body.pesoSegundaFreq}`);

  const blocoMin = partesMin.length ? `Min: ${partesMin.join(", ")}` : "";
  const blocoPeso = partesPeso.length ? `Pesos: ${partesPeso.join(", ")}` : "";

  const separador = blocoMin && blocoPeso ? " | " : "";

  const nome = user?.nome ?? "Utilizador desconhecido";

  return [`Utilizador ${nome} definiu a fórmula da UC ${body.codigo}${blocoMin || blocoPeso ? " — " : ""
    }${blocoMin}${separador}${blocoPeso}`];
}
