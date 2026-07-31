import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ImportSchedulesService } from "./Import-schedules.service";

import { ApiTags } from "@nestjs/swagger";
import { RemoteJwtAuthGuard } from "src/common/guard/remote.jwt-auth.guard";
import { PermissionsGuard } from "src/common/secret/permissions.guard";
import { CreateSchedulesImportedService, ImportSummary } from "./create-schedules-imported.service";
import { ImportSchedulesDto } from "./dto/Import-schedules.dto";
import { CreateImportSchedulesDto } from "./dto/create-schedules-imported.dto";


@ApiTags('IMPORT SCHEDULE')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('import-schedules')
export class ImportSchedulesController {
    constructor(
        private readonly importSchedulesService: ImportSchedulesService,
        private readonly createSchedulesImportedService: CreateSchedulesImportedService
    ) { }

    @Get()
    async getSchedulesToImport(@Query() query: ImportSchedulesDto) {
        return this.importSchedulesService.getSchedulesToImport(query)
    }

    @Post()
    async createSchedulesImported(@Body() body: CreateImportSchedulesDto, @Req() req: any): Promise<ImportSummary> {
        const user = req.user;
        return this.createSchedulesImportedService.createSchedulesImported(body, user?.sub)
    }



}