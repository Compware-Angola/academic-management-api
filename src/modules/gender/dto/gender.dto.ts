export class GendersDto {
    id: number;
    description: string;

    constructor(data: Partial<GendersDto>) {
        Object.assign(this, data);
    }
}