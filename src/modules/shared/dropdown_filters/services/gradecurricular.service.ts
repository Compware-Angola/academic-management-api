import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';
import { DataSource } from 'typeorm';
import { FindUnidadesCurricularesDTO } from '../dto/find-unidades-curriculares.dto';

@Injectable()
export class GradeCurricularService {
  constructor(private readonly dataSource: DataSource) {}
  async findUnidadesCurriculares({
    curso,
    semestre,
    classe,
    anoLectivo,
  }: FindUnidadesCurricularesDTO) {
    const anoLectivoFiltro =
      anoLectivo && anoLectivo !== 23 ? anoLectivo : null;

    const sqlUnidadesCurriculares = `
    select distinct
        gc.codigo              as pk,
        d.designacao           as descricao,
        d.nome_abreviatura     as codigo
    from FK2_TB_GRADE_CURRICULAR gc
    inner join FK2_TB_DISCIPLINAS d
      on gc.CODIGO_DISCIPLINA = d.CODIGO
    inner join FK2_TB_PLANO_CURRICULAR_GRADE pcg
      on gc.CODIGO = pcg.CODIGO_GRADE_CURRICULAR
    inner join FK2_TB_PLANO_CURRICULAR_CURSO pcc
      on pcg.CODIGO_PLANO_CURRICULAR_CURSO = pcc.CODIGO
    where 1=1
    and (:curso is null or gc.CODIGO_CURSO = :curso)
    and (:semestre is null or gc.CODIGO_SEMESTRE = :semestre)
    and (:classe is null or gc.CODIGO_CLASSE = :classe)
    and (:anoLectivo is null or pcc.CODIGO_ANO_LECTIVO = :anoLectivo)
    and gc.STATUS_ = 1
  `;

    const params = {
      curso: curso ?? null,
      semestre: semestre ?? null,
      classe: classe ?? null,
      anoLectivo: anoLectivoFiltro,
    };

    try {
      const [result] = await Promise.all([
        this.dataSource.query(sqlUnidadesCurriculares, params as any),
      ]);

      return {
        data: await toLowerCaseKeys(result),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Erro ao listar unidades curriculares: ' + error.message,
      );
    }
  }
}
