export class PaginationDto {
    page: number;
    limit: number;
    total: number;
    totalPages: number;

    constructor(data: PaginationDto) {
        Object.assign(this, data);
    }
}