export enum EstadoAnoLectivoType {
  RASCUNHO = 'RASCUNHO', // nada é permitido ainda
  CONFIGURAVEL = 'CONFIGURAVEL', // pode criar horários, NÃO pode matricular
  USAVEL = 'USAVEL', // pode criar horários E matricular estudantes
  ENCERRADO = 'ENCERRADO', // fechado, só leitura
}
