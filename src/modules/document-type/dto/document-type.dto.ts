export class DocumentTypeDto {
    id: number;
    description: string;

    constructor(data: Partial<DocumentTypeDto>) {
        Object.assign(this, data);
    }
}