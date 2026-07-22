import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("FK2_TB_ESTADO_CIVIL")
export class MaritalStatus {
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