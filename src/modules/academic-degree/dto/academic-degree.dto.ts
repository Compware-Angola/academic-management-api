export class AcademicDegreesDto {
    id: number;
    description: string;
    status: number;

    constructor(data: Partial<AcademicDegreesDto>) {
        Object.assign(this, data);
    }
}