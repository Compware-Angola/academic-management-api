import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity({ name: 'FK2_MCA_TB_GRUPO' })
export class Grupo {
  @PrimaryGeneratedColumn({ type: 'number', name: 'PK_GRUPO' })
  pkGrupo: number;

  @Column({ type: 'varchar2', length: 100, name: 'DESIGNACAO', nullable: true })
  designacao: string;

  @Column({ type: 'varchar2', length: 300, name: 'DESCRICAO', nullable: true })
  descricao: string;

  @Column({ type: 'varchar2', length: 100, name: 'SIGLA', nullable: true })
  sigla: string;

  @Column({ type: 'number', name: 'FK_TIPO_DE_GRUPO', nullable: true })
  fkTipoDeGrupo: number;

  @Column({ type: 'varchar2', length: 300, name: 'OBS', nullable: true })
  obs: string;

  @Column({ type: 'number', name: 'ORDEM', nullable: true })
  ordem: number;

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

  // Mapeamento para o tipo CLOB do Oracle
  @Column({ type: 'clob', name: 'MODULOS', nullable: true })
  modulos: string;
}