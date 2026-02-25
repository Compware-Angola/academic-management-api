import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('FK2_TB_AVISO_UMA')
export class AvisoUma {

  @PrimaryGeneratedColumn({ name: 'ID' })
  id: number;

  @Column({ name: 'ASSUNTO', type: 'varchar2' })
  assunto: string;

  @Column({ name: 'DATE_EXPIRACAO', type: 'date', nullable: true })
  dateExpiracao: Date;

  @Column({ name: 'USER_ID', type: 'number' })
  userId: number;

  @Column({ name: 'DESCRICAO', type: 'clob' })
  descricao: string;

  @Column({ name: 'SIGLA', type: 'varchar2', nullable: true })
  sigla: string;

  @Column({ name: 'FILE_NAME', type: 'varchar2', nullable: true })
  fileName: string;

  @Column({ name: 'DESTINO', type: 'number', nullable: true })
  destino: number;

  @Column({ name: 'CURSO', type: 'number', nullable: true })
  curso: number;

  @Column({ name: 'PERIODO', type: 'number', nullable: true })
  periodo: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'date' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'date' })
  updatedAt: Date;

  @Column({ name: 'CANAL', type: 'number', nullable: true })
  canal: number;

  @Column({ name: 'STATUS_', type: 'number', nullable: true })
  status: number;

  @Column({ name: 'ORIGEM', type: 'number', nullable: true })
  origem: number;
}