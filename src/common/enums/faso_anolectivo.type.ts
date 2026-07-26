export enum EstadoAnoLectivoType {
  RASCUNHO = 'RASCUNHO', // nada é permitido ainda
  CONFIGURAVEL = 'CONFIGURAVEL', // pode criar horários, NÃO pode matricular
  USAVEL = 'USAVEL', // pode criar horários E matricular estudantes
  ENCERRADO = 'ENCERRADO', // fechado, só leitura
  ACTIVO = 'ACTIVO',
}

export type AcademicYearPhaseTransitions = Record<
  EstadoAnoLectivoType,
  EstadoAnoLectivoType[]
>;

export const VALID_PHASE_TRANSITIONS: AcademicYearPhaseTransitions = {
  [EstadoAnoLectivoType.RASCUNHO]: [
    EstadoAnoLectivoType.CONFIGURAVEL,
    EstadoAnoLectivoType.ENCERRADO,
  ],
  [EstadoAnoLectivoType.CONFIGURAVEL]: [
    EstadoAnoLectivoType.USAVEL,
    EstadoAnoLectivoType.RASCUNHO,
    EstadoAnoLectivoType.ENCERRADO,
  ],
  [EstadoAnoLectivoType.USAVEL]: [
    EstadoAnoLectivoType.CONFIGURAVEL,
    EstadoAnoLectivoType.ACTIVO,
    EstadoAnoLectivoType.ENCERRADO,
  ],
  [EstadoAnoLectivoType.ACTIVO]: [EstadoAnoLectivoType.ENCERRADO],
  [EstadoAnoLectivoType.ENCERRADO]: [],
};
