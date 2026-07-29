export class NationalityDto {
    id: number;
    description: string;

    constructor(data: Partial<NationalityDto>) {
        Object.assign(this, data);
    }
}