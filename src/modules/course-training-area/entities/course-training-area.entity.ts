import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('FK2_TB_CURSO_AREA_FORMACOES')
export class CourseTrainingArea {
    @PrimaryColumn({
        name: 'CODIGO',
        type: 'number',
    })
    id: number;

    @Column({
        name: 'DESIGNACAO',
        type: 'varchar2',
        length: 450,
    })
    description: string;

    @Column({
        name: 'DESCRICAO',
        type: 'clob',
        nullable: true,
    })
    details?: string;

    @Column({
        name: 'SIGLA',
        type: 'varchar2',
        length: 45,
        nullable: true,
    })
    acronym?: string;

    @Column({
        name: 'ESTADO_CURSOS_RELACIONADOS_ID',
        type: 'number',
        nullable: true,
    })
    status?: number;

    @Column({
        name: 'AREA_FORMACAO_ID',
        type: 'number',
        nullable: true,
    })
    trainingAreaId?: number;
}