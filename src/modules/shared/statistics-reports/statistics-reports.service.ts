import { BadRequestException, Injectable } from '@nestjs/common';
import { AnoLectivoUtil } from 'src/modules/util/current-academic-year';
import { DataSource } from 'typeorm';

@Injectable()
export class StatisticsReportsService {
  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { }


  async dashboardStatisticsReports(anoLectivo?: number) {
    let semestreAtual = await this.anoLectivoUtil.getSemestresConfigurados();
    if (!anoLectivo) {
      if (!semestreAtual) {
        throw new BadRequestException('Ano Lectivo não encontrado');
      }
      anoLectivo = semestreAtual.anoLetivo?.id;
    }

    const queryTotalAlunos = `
SELECT
    COUNT(DISTINCT m.CODIGO) AS total_alunos
FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
INNER JOIN FK2_TB_MATRICULAS m
    ON m.CODIGO = ftgca.CODIGO_MATRICULA
WHERE ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
  AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)

`;
    const resultTotalAlunos = await this.dataSource.query(queryTotalAlunos, { anoLectivo } as any);

    return {
      totalAlunosInscritos: {
        total: resultTotalAlunos[0].TOTAL_ALUNOS || 0,
        descricao: `Total de Alunos Inscritos Ano Lectivo ${semestreAtual?.anoLetivo?.designacao || ''}`,
      },

    };
  }
}
