export enum UserRole {
  DOCENTE = 'docente',

  REITOR = 'Reitor',
  FACULDADES = 'Faculdades',
  VICE_REITOR = 'Vice_Reitor',
  ACESSOR_DO_REITOR = 'Acessor_do_Reitor',
  RESPONSAVEL_DO_GABINETE_DE_QUALIDADE_E_SERVICOS_PEDAGOGICOS = 'Responsável_do_Gabinete_de_qualidade_e_Serviços_Pedagógicos',
  DIRECTOR = 'Director',
  COORDENADOR = 'Coordenador',
  DECANO = 'Decano'

  // outros roles...
}

export interface UserRoles {
  [UserRole.DOCENTE]: boolean;

  [UserRole.REITOR]: boolean;
  [UserRole.FACULDADES]: boolean;
  [UserRole.VICE_REITOR]: boolean;
  [UserRole.ACESSOR_DO_REITOR]: boolean;
  [UserRole.RESPONSAVEL_DO_GABINETE_DE_QUALIDADE_E_SERVICOS_PEDAGOGICOS]: boolean;
  [UserRole.DIRECTOR]: boolean;
  [UserRole.COORDENADOR]: boolean;
  [UserRole.DECANO]: boolean;

}