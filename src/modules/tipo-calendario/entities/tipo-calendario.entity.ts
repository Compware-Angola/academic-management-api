import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('FK2_TB_TIPO_CALENDARIO', { schema: 'CMPDEV' })
export class TipoCalendario {
  @PrimaryColumn({ name: 'CODIGO', type: 'number' })
  codigo: number;

  @Column({ name: 'DESIGNACAO', type: 'varchar2', length: 150, nullable: true })
  designacao: string;

  @Column({ name: 'ATIVO_PARA_ALUNO', type: 'number', nullable: true })
  ativoParaAluno: number;

  @Column({ name: 'SIGLA', type: 'varchar2', length: 20, nullable: true })
  sigla: string;
}
