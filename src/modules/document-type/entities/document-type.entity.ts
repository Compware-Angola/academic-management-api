import { Column, Entity, PrimaryColumn } from "typeorm";
@Entity("FK2_TB_TIPO_DOCUMENTOS")
export class DocumentType {
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