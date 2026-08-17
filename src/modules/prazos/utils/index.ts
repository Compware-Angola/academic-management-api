import { CodigoTipoCalendario } from './tipo-calendario.enum';

export type MensagensPrazo = {
  antes: string;
  durante: string;
  depois: string;
  naoConfigurado: string;
};

export const MENSAGENS_PADRAO: Record<CodigoTipoCalendario, MensagensPrazo> = {
  1: {
    antes: 'O período de afectação ainda não foi iniciado.',
    durante: 'O período de afectação está em curso.',
    depois: 'O período de afectação está encerrado.',
    naoConfigurado: 'O calendário de afectação ainda não foi configurado.',
  },

  2: {
    antes: 'O período de criação de horários ainda não foi iniciado.',
    durante: 'O período de criação de horários está em curso.',
    depois: 'O período de criação de horários está encerrado.',
    naoConfigurado:
      'O calendário de criação de horários ainda não foi configurado.',
  },

  3: {
    antes: 'O período de inscrição de novos estudantes ainda não foi iniciado.',
    durante: 'O período de inscrição de novos estudantes está em curso.',
    depois: 'O período de inscrição de novos estudantes está encerrado.',
    naoConfigurado:
      'O calendário de inscrição de novos estudantes ainda não foi configurado.',
  },

  4: {
    antes: 'O período de confirmação de matrícula ainda não foi iniciado.',
    durante: 'O período de confirmação de matrícula está em curso.',
    depois: 'O período de confirmação de matrícula está encerrado.',
    naoConfigurado:
      'O calendário de confirmação de matrícula ainda não foi configurado.',
  },

  5: {
    antes: 'O período de exame de acesso ainda não foi iniciado.',
    durante: 'O período de exame de acesso está em curso.',
    depois: 'O período de exame de acesso está encerrado.',
    naoConfigurado:
      'O calendário de exame de acesso ainda não foi configurado.',
  },

  6: {
    antes: 'O período de abertura do ano lectivo ainda não foi iniciado.',
    durante: 'O período de abertura do ano lectivo está em curso.',
    depois: 'O período de abertura do ano lectivo está encerrado.',
    naoConfigurado:
      'O calendário de abertura do ano lectivo ainda não foi configurado.',
  },

  7: {
    antes: 'O período de candidatura de docentes ainda não foi iniciado.',
    durante: 'O período de candidatura de docentes está em curso.',
    depois: 'O período de candidatura de docentes está encerrado.',
    naoConfigurado:
      'O calendário de candidatura de docentes ainda não foi configurado.',
  },

  8: {
    antes: 'O período de selecção de horários ainda não foi iniciado.',
    durante: 'O período de selecção de horários está em curso.',
    depois: 'O período de selecção de horários está encerrado.',
    naoConfigurado:
      'O calendário de selecção de horários ainda não foi configurado.',
  },

  9: {
    antes: 'O período de inscrição para exame de recurso ainda não foi iniciado.',
    durante: 'O período de inscrição para exame de recurso está em curso.',
    depois: 'O período de inscrição para exame de recurso está encerrado.',
    naoConfigurado:
      'O calendário de inscrição para exame de recurso ainda não foi configurado.',
  },

  10: {
    antes:
      'O período de inscrição para exame especial ainda não foi iniciado.',
    durante: 'O período de inscrição para exame especial está em curso.',
    depois: 'O período de inscrição para exame especial está encerrado.',
    naoConfigurado:
      'O calendário de inscrição para exame especial ainda não foi configurado.',
  },

  11: {
    antes: 'O período para melhoria de notas ainda não foi iniciado.',
    durante: 'O período para melhoria de notas está em curso.',
    depois: 'O período para melhoria de notas está encerrado.',
    naoConfigurado:
      'O calendário para melhoria de notas ainda não foi configurado.',
  },

  12: {
    antes: 'O período de reingresso ainda não foi iniciado.',
    durante: 'O período de reingresso está em curso.',
    depois: 'O período de reingresso está encerrado.',
    naoConfigurado: 'O calendário de reingresso ainda não foi configurado.',
  },

  13: {
    antes: 'O período de substituição de UC ainda não foi iniciado.',
    durante: 'O período de substituição de UC está em curso.',
    depois: 'O período de substituição de UC está encerrado.',
    naoConfigurado:
      'O calendário de substituição de UC ainda não foi configurado.',
  },

  14: {
    antes:
      'O período de mudança interna de curso ainda não foi iniciado.',
    durante: 'O período de mudança interna de curso está em curso.',
    depois: 'O período de mudança interna de curso está encerrado.',
    naoConfigurado:
      'O calendário de mudança interna de curso ainda não foi configurado.',
  },

  15: {
    antes:
      'O período de inscrição em cadeiras extracurriculares ainda não foi iniciado.',
    durante:
      'O período de inscrição em cadeiras extracurriculares está em curso.',
    depois:
      'O período de inscrição em cadeiras extracurriculares está encerrado.',
    naoConfigurado:
      'O calendário de inscrição em cadeiras extracurriculares ainda não foi configurado.',
  },

  16: {
    antes: 'O período de matrículas ainda não foi iniciado.',
    durante: 'O período de matrículas está em curso.',
    depois: 'O período de matrículas está encerrado.',
    naoConfigurado:
      'O calendário de matrículas ainda não foi configurado.',
  },
};
