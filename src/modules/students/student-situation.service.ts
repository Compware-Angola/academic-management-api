import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { Injectable, NotFoundException,InternalServerErrorException } from "@nestjs/common";
import { CreateStudentSituationDto } from "./dto/create-student-situation.dto";

@Injectable()
export class StudentSituationService {
    constructor(private readonly dataSource: DataSource) {}

   async create(data: CreateStudentSituationDto): Promise<any> {
    const [enrollment, reasonSituation, academicYear] = await Promise.all([
        this.enrollment(data.enrollmentCode),
        this.reasonSituation(data.reasonSituationCode),
        this.academicYear(data.academicYearCode)
    ]);

    if (!enrollment)
        throw new NotFoundException(`Matrícula ${data.enrollmentCode} não encontrada`);

    if (!reasonSituation)
        throw new NotFoundException(`Motivo ${data.reasonSituationCode} não encontrado`);

    if (!academicYear)
        throw new NotFoundException(`Ano lectivo ${data.academicYearCode} não encontrado`);

    try {
        await this.dataSource.transaction(async (manager) => {

            // 1. Motivo aluno situação
            await manager.query(
                `
                INSERT INTO FK2_TB_MOTIVO_ALUNO_SITUACAO
                (
                    CODIGO_MATRICULA,
                    CODIGO_ANO_LECTIVO,
                    CODIGO_SITUACAO,
                    CREATED_AT
                )
                VALUES
                (
                    :1,
                    :2,
                    :3,
                    SYSDATE
                )
                `,
                [
                    enrollment.codigo,
                    academicYear.codigo,
                    reasonSituation.codigo
                ]
            );

            // 2. Histórico aluno
            await manager.query(
                `
                INSERT INTO FK2_TB_HISTORICO_ESTADO_ALUNO
                (
                    CODIGOMATRICULA,
                    DESIGNACAO,
                    ESTADO,
                    COR,
                    CREATEDAT
                )
                VALUES
                (
                    :1,
                    :2,
                    :3,
                    :4,
                    SYSDATE
                )
                `,
                [
                    enrollment.codigo,
                    reasonSituation.designacao,
                    0,
                    'Não Definido'
                ]
            );
        });

      return {message: "Situação do aluno criada com sucesso"}
    } catch (error) {
        console.error("Erro ao criar situação do aluno:", error);
        throw new InternalServerErrorException("Falha ao processar situação do aluno");
    }
}

private async reasonSituation(codigoMotivo: number): Promise<any> {
    const query = `SELECT * FROM FK2_TB_MOTIVO_SITUACAO WHERE CODIGO = :codigoMotivo`
    const [result] = await this.dataSource.query(query, [codigoMotivo]);
    return result ? toLowerCaseKeys(result) : null ;
}
private async enrollment(codigoMatricula: number): Promise<any> {
    const query = `SELECT CODIGO FROM FK2_TB_MATRICULAS WHERE CODIGO = :codigoMatricula`
    const [result] = await this.dataSource.query(query, [codigoMatricula]);
    return result ? toLowerCaseKeys(result) : null ;
}
private async academicYear(academicYearCode: number): Promise<any> {
    const query = `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :academicYear`
    const [result] = await this.dataSource.query(query, [academicYearCode]);
    return result ? toLowerCaseKeys(result) : null ;
}

}