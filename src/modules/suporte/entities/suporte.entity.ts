

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('FK2_CONTACTOS_RESPOSTAS')
export class Suporte {
  @PrimaryGeneratedColumn({ name: 'ID' })  
  id: number;

  @Column({ name: 'DESCRICAO' })
  descricao: string;

  @Column({ name: 'USER_ID' })
  userId: number;

  @Column({ name: 'CONTACTOS_ID' })
  contactosId: number;

  @Column({ name: 'STATUS_' })
  status: number;

  @CreateDateColumn({ name: 'CREATED_AT' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT' })
  updatedAt: Date;

  @Column({ name: 'FILE_NAME1', nullable: true })
  fileName1?: string;

  @Column({ name: 'FILE_NAME2', nullable: true })
  fileName2?: string;

  @Column({ name: 'FILE_NAME3', nullable: true })
  fileName3?: string;
}
