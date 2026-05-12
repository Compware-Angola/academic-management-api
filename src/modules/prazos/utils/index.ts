import { CodigoTipoCalendario } from './tipo-calendario.enum';

export type MensagensPrazo = {
  antes: string;
  durante: string;
  depois: string;
  naoConfigurado: string;
};

export const MENSAGENS_PADRAO: Record<CodigoTipoCalendario, MensagensPrazo> = {
  1: {
    antes: 'A época de afectação ainda não está disponível.',
    durante: 'A época de afectação está aberta.',
    depois: 'A época de afectação terminou.',
    naoConfigurado: 'O calendário de afectação não foi configurado.',
  },

  2: {
    antes: 'A criação de horários ainda não está disponível.',

    durante: 'A criação de horários está aberta.',

    depois: 'A criação de horários terminou.',

    naoConfigurado: 'O calendário de criação de horários não foi configurado.',
  },

  3: {
    antes: 'A inscrição de novos estudantes ainda não está disponível.',

    durante: 'A inscrição de novos estudantes está aberta.',

    depois: 'A inscrição de novos estudantes terminou.',

    naoConfigurado:
      'O calendário de inscrição de novos estudantes não foi configurado.',
  },

  4: {
    antes: 'A confirmação de matrícula ainda não está disponível.',

    durante: 'A confirmação de matrícula está aberta.',

    depois: 'A confirmação de matrícula terminou.',

    naoConfigurado:
      'O calendário de confirmação de matrícula não foi configurado.',
  },

  5: {
    antes: 'O exame de acesso ainda não está disponível.',

    durante: 'O exame de acesso está aberto.',

    depois: 'O exame de acesso terminou.',

    naoConfigurado: 'O calendário de exame de acesso não foi configurado.',
  },

  6: {
    antes: 'A abertura do ano lectivo ainda não está disponível.',

    durante: 'A abertura do ano lectivo está activa.',

    depois: 'A abertura do ano lectivo terminou.',

    naoConfigurado:
      'O calendário de abertura do ano lectivo não foi configurado.',
  },

  7: {
    antes: 'A candidatura de docentes ainda não está disponível.',

    durante: 'A candidatura de docentes está aberta.',

    depois: 'A candidatura de docentes terminou.',

    naoConfigurado:
      'O calendário de candidatura de docentes não foi configurado.',
  },

  8: {
    antes: 'A selecção de horários ainda não está disponível.',

    durante: 'A selecção de horários está aberta.',

    depois: 'A selecção de horários terminou.',

    naoConfigurado: 'O calendário de selecção de horários não foi configurado.',
  },

  9: {
    antes: 'A época para inscrição de Recurso ainda não está disponível!',

    durante: 'A época para inscrição de Recurso está aberta.',

    depois: 'A época para inscrição de Recurso terminou.',

    naoConfigurado: 'O calendário de Recurso não foi configurado.',
  },

  10: {
    antes:
      'A época para inscrição de Exame Especial ainda não está disponível!',

    durante: 'A época para inscrição de Exame Especial está aberta.',

    depois: 'A época para inscrição de Exame Especial terminou.',

    naoConfigurado: 'O calendário de Exame Especial não foi configurado.',
  },

  11: {
    antes: 'A época para Melhoria de Notas ainda não está disponível!',

    durante: 'A época para Melhoria de Notas está aberta.',

    depois: 'A época para Melhoria de Notas terminou.',

    naoConfigurado: 'O calendário de Melhoria de Notas não foi configurado.',
  },

  12: {
    antes: 'A época para Reingresso ainda não está disponível!',

    durante: 'A época para Reingresso está aberta.',

    depois: 'A época para Reingresso terminou.',

    naoConfigurado: 'O calendário de Reingresso não foi configurado.',
  },

  13: {
    antes: 'A época para substituição de UC ainda não está disponível!',

    durante: 'A época para substituição de UC está aberta.',

    depois: 'A época para substituição de UC terminou.',

    naoConfigurado: 'O calendário de substituição de UC não foi configurado.',
  },

  14: {
    antes: 'A época para mudança de curso interna ainda não está disponível!',

    durante: 'A época para mudança de curso interna está aberta.',

    depois: 'A época para mudança de curso interna terminou.',

    naoConfigurado:
      'O calendário de mudança de curso interna não foi configurado.',
  },

  15: {
    antes:
      'A inscrição para cadeiras extracurriculares ainda não está disponível!',

    durante: 'A inscrição para cadeiras extracurriculares está aberta.',

    depois: 'A inscrição para cadeiras extracurriculares terminou.',

    naoConfigurado:
      'O calendário de cadeiras extracurriculares não foi configurado.',
  },

  16: {
    antes: 'A época de matrículas ainda não está disponível!',

    durante: 'A época de matrículas está aberta.',

    depois: 'A época de matrículas terminou.',

    naoConfigurado: 'O calendário de matrículas não foi configurado.',
  },
};
