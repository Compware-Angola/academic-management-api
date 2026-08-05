import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';
import { DataSource } from 'typeorm';
import { FindHorarioVerInscricaoDTO } from '../dto/find-horario-ver-inscricao.dto';

@Injectable()
export class HorarioVerInscricaoServiceDropDown {
  constructor(private readonly dataSource: DataSource) {}

  async findHorarioVerInscricao({
    curso,
    gradeCurricular,
    anoLectivo,
    periodo
  }: FindHorarioVerInscricaoDTO) {
    const sqlDisciplinaGrade = `
      SELECT 
          GR.CODIGO_DISCIPLINA,
          DIS.DESIGNACAO AS DISCIPLINA
      FROM FK2_TB_GRADE_CURRICULAR GR
      INNER JOIN FK2_TB_DISCIPLINAS DIS
          ON DIS.CODIGO = GR.CODIGO_DISCIPLINA
      WHERE GR.CODIGO = :gradeCurricular
    `;

    try {
      const [disciplinaGrade] = await this.dataSource.query(
        sqlDisciplinaGrade,
        { gradeCurricular: gradeCurricular ?? null } as any,
      );

      const codigoDisciplina = disciplinaGrade?.CODIGO_DISCIPLINA ?? null;
      const designacaoDisciplina = disciplinaGrade?.DISCIPLINA ?? null;

      const sqlHorario = `
        SELECT
            HR.DESIGNACAO,
            HR.PK_HORARIO,
            GR.CODIGO_DISCIPLINA,
            DIS.DESIGNACAO AS DISCIPLINA
        FROM FK2_MGH_TB_HORARIO HR
        INNER JOIN FK2_TB_GRADE_CURRICULAR GR
            ON GR.CODIGO = HR.FK_GRADE_CURRICULAR
        INNER JOIN FK2_TB_DISCIPLINAS DIS
            ON DIS.CODIGO = GR.CODIGO_DISCIPLINA
        WHERE 1 = 1
        AND HR.FK_ANO_LECTIVO = :anoLectivo
        AND HR.ACTIVE_STATE = 1
        AND HR.FK_ESTADO_HORARIO_WF = 3
        AND( HR.FK_PERIODO = :periodo OR :periodo IS NULL)
        AND (
            (DIS.CODIGO = :codigoDisciplina)
            OR (
                GR.CODIGO_CURSO = :curso
                AND UPPER(FN_REMOVE_ACENTOS(DIS.DESIGNACAO)) = UPPER(FN_REMOVE_ACENTOS(:designacaoDisciplina))
            )
        )
      `;

      const result = await this.dataSource.query(sqlHorario, {
        anoLectivo: anoLectivo ?? null,
        curso: curso ?? null,
        codigoDisciplina,
        designacaoDisciplina,
        periodo: periodo ?? null
      } as any);

      return {
        data: await toLowerCaseKeys(result),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Erro ao listar horário: ' + error.message,
      );
    }
  }
}