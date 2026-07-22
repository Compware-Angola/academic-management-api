import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("FK2_TB_GRAU_ACADEMICO")
export class AcademicDegree {
    @PrimaryColumn({
        name: 'CODIGO',
        type: 'number'
    })
    id: number;
    @Column({
        name: 'DESIGNACAO',
        type: 'varchar'
    })
    description: string;

    @Column({
        name: 'STATUS_',
        type: 'number'
    })
    status: number;
}