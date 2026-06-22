import { Controller, Get, Query } from "@nestjs/common";
import { GuidanceResearchManagementService } from "../services/guidance-research-management.service";
import { ApiTags } from "@nestjs/swagger";
import { StudentsQueryDto } from "../dto/guidance-research-management";

@ApiTags('Pos Graduacao - Gestão de Orientação e Pesquisa')
@Controller('post-graduation/guidance-research-management')
export class GuidanceResearchManagementController {
    constructor(private readonly guidanceResearchManagementService: GuidanceResearchManagementService) {}

    @Get('students')
    async findStudents(@Query() query:StudentsQueryDto) {
        return await this.guidanceResearchManagementService.findStudents(query);
    }
}