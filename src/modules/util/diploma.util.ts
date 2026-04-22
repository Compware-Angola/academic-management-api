// src/common/utils/diploma.util.ts

/**
 * Formata uma data para formato por extenso (pt-PT)
 */
export function formatarDataExtenso(data: Date | string): string {
  const date = new Date(data);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Converte nota numérica para extenso
 */
export function notaExtenso(nota: number): string {
  const mapa: Record<number, string> = {
    0: 'zero valores',
    1: 'um valor',
    2: 'dois valores',
    3: 'três valores',
    4: 'quatro valores',
    5: 'cinco valores',
    6: 'seis valores',
    7: 'sete valores',
    8: 'oito valores',
    9: 'nove valores',
    10: 'dez valores',
    11: 'onze valores',
    12: 'doze valores',
    13: 'treze valores',
    14: 'catorze valores',
    15: 'quinze valores',
    16: 'dezasseis valores',
    17: 'dezassete valores',
    18: 'dezoito valores',
    19: 'dezanove valores',
    20: 'vinte valores',
  };

  return mapa[Math.round(nota)] || `${nota} valores`;
}