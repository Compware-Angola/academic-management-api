export class MaritalStatusDto {
    id: number;
    description: string;

    constructor(data: Partial<MaritalStatusDto>) {
        Object.assign(this, data);
    }
}