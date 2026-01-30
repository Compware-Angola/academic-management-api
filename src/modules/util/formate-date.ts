 export const formatHora = (hora: any): string => {
  if (!hora) return '';

  // Se vier como Date (muito comum no Oracle)
  if (hora instanceof Date) {
    const h = hora.getHours().toString().padStart(2, '0');
    const m = hora.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Se vier como number (timestamp)
  if (typeof hora === 'number') {
    const d = new Date(hora);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Se vier como string
  if (typeof hora === 'string') {
    // já está em HH:mm
    if (/^\d{2}:\d{2}$/.test(hora)) {
      return hora;
    }

    // extrai HH:mm de qualquer string
    const match = hora.match(/([0-2]\d:[0-5]\d)/);
    return match ? match[1] : '';
  }

  return '';
};
