import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("FK2_TB_SEXO")
export class Gender {
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
}