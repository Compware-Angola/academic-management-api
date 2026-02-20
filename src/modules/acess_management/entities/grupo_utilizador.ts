import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'FK2_MCA_TB_GRUPO_UTILIZADOR' })
export class GrupoUtilizador {
  @PrimaryGeneratedColumn({ type: 'number', name: 'PK_GRUPO_UTILIZADOR' })
  pkGrupoUtilizador: number;

  @Column({ type: 'number', name: 'FK_GRUPO', nullable: true })
  fkGrupo: number;

  @Column({ type: 'number', name: 'FK_UTILIZADOR', nullable: true })
  fkUtilizador: number;

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
}