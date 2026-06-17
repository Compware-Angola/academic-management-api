import { Injectable } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";
import { buildStudentCountQuery, buildStudentQuery,buildStudentWhereClause } from "../query-builder/student.query-builder";
import { StudentsQueryDto } from "../dto/guidance-research-management";

@Injectable()
export class GuidanceResearchManagementService {
    constructor(private readonly dataSource: DataSource) {}

    async findStudents(filters:StudentsQueryDto) {
    const {limit= 10 ,page =1} = filters
    const offset = (page - 1)  * limit 
     const {clauses,params} = buildStudentWhereClause(filters)
     const whereClause = clauses.length > 0 ? clauses.join(' AND ') : '1=1';

   const [rows, count] = await Promise.all([
  this.dataSource.query(
    buildStudentQuery(whereClause),
    {
      ...params,
      offset,
      limit,
    } as any,
  ),
  this.dataSource.query(
    buildStudentCountQuery(whereClause),
    params as any,
  ),
]);
 const total = Number(count[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);
return {
      data: toLowerCaseKeys(rows),
      total,
      page,
      limit,
      totalPages,
    }
       
}
}