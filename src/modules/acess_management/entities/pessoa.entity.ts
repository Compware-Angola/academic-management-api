import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity({ name: 'FK2_TB_PESSOA' })
export class Pessoa {

  @PrimaryGeneratedColumn({ 
    type: 'number', 
    name: 'PK_PESSOA' 
  })
  pkPessoa: number;

  @Column({ type: 'varchar2', length: 100, name: 'NOME_COMPLETO', nullable: true })
  nomeCompleto: string;

  @Column({ type: 'varchar2', length: 100, name: 'NOME_DO_PAI', nullable: true })
  nomeDoPai: string;

  @Column({ type: 'varchar2', length: 100, name: 'NOME_DA_MAE', nullable: true })
  nomeDaMae: string;

  @Column({ type: 'date', name: 'DATA_DE_NASCIMENTO', nullable: true })
  dataDeNascimento: Date;

  @Column({ type: 'varchar2', length: 100, name: 'NUM_DOC_IDENTIFICACAO', nullable: true })
  numDocIdentificacao: string;

  @Column({ type: 'number', name: 'FK_TIPO_DOCUMENTO_IDENTI', nullable: true })
  fkTipoDocumentoIdenti: number;

  @Column({ type: 'date', name: 'DATA_DE_EMISSAO_DOCUME', nullable: true })
  dataDeEmissaoDocume: Date;

  @Column({ type: 'date', name: 'DATA_DE_EXPIRACAO_DOCUM', nullable: true })
  dataDeExpiracaoDocum: Date;

  @Column({ type: 'number', name: 'FK_GENERO', nullable: true })
  fkGenero: number;

  @Column({ type: 'number', name: 'FK_NACIONALIDADE', nullable: true })
  fkNacionalidade: number;

  @Column({ type: 'varchar2', length: 255, name: 'ENDERECO', nullable: true })
  endereco: string;

  @Column({ type: 'number', name: 'FK_NATURALIDADE', nullable: true })
  fkNaturalidade: number;

  @Column({ type: 'number', name: 'FK_ESTADO_CIVIL', nullable: true })
  fkEstadoCivil: number;

  @Column({ type: 'varchar2', length: 50, name: 'TELEFONE1', nullable: true })
  telefone1: string;

  @Column({ type: 'varchar2', length: 50, name: 'TELEFONE2', nullable: true })
  telefone2: string;

  @Column({ type: 'varchar2', length: 50, name: 'EMAIL', nullable: true })
  email: string;

  @Column({ type: 'number', name: 'CREATED_BY', nullable: true })
  createdBy: number;

  @Column({ type: 'number', name: 'LAST_UPDATED_BY', nullable: true })
  lastUpdatedBy: number;

  @CreateDateColumn({ type: 'date', name: 'CREATED_AT', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'date', name: 'UPDATED_AT', nullable: true })
  updatedAt: Date;

  @Column({ type: 'number', name: 'ACTIVE_STATE', nullable: true })
  activeState: number;
}