import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("FK2_TB_NACIONALIDADES")
export class Nationality {
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