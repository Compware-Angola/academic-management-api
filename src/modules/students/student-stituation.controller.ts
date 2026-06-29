import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { StudentSituationService } from "./student-situation.service";
import { CreateStudentSituationDto } from "./dto/create-student-situation.dto";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RemoteJwtAuthGuard } from "../../common/guard/remote.jwt-auth.guard";
import { PermissionsGuard } from "../../common/secret/permissions.guard";
import { HttpService } from "@nestjs/axios";
import { AccessLogHelper } from "../../common/helpers/access-log.helper";
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@ApiTags('Students')
@Controller('students/situation')
export class StudentSituationController {
  constructor(private readonly studentSituationService: StudentSituationService, private httpService: HttpService,) { }
  private log(req: any, descricao: string) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    AccessLogHelper.logAccess(this.httpService, {
      descricao,
      fkUtilizadorResponsavel: user?.sub,
      ip,
    });
  }
  @Post()
  @ApiOperation({ summary: 'Criar situação de estudante' })
  async create(@Body() data: CreateStudentSituationDto, @Req() req: any) {
    this.log(req, `Utilizador ${req.user.sub} criou situação de estudante ${data.enrollmentCode}`);
    return this.studentSituationService.create(data);
  }
}