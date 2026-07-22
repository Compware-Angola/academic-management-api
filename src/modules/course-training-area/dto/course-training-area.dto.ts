export class CourseTrainingAreaDto {
    id: number;
    description: string;
    trainingAreaId?: number;
    status?: number;

    constructor(data: Partial<CourseTrainingAreaDto>) {
        Object.assign(this, data);
    }
}