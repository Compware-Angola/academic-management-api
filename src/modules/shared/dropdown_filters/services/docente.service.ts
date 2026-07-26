import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  GrauAcademicoSigla,
  obterGrauAcademicoPorTipoCandidatura,
} from 'src/common/enums/grau_academico.sigla';
import { TipoCandidaturaSigla } from 'src/common/enums/tipo_candidatura.sigla';
import { FindDocentesDTO } from 'src/modules/academic_activities/dto/find-docente.dto';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';
import { DataSource } from 'typeorm';

const SIGLAS_QUE_EXIGEM_DOUTOR = new Set([
  TipoCandidaturaSigla.DOUTORAMENTO,
  TipoCandidaturaSigla.MESTRADO,
]);

@Injectable()
export class DocenteDropDownService {
  constructor(private readonly dataSource: DataSource) {}

  async findSiglaTipoCandidatura(
    tipoCandidatura: number,
  ): Promise<string | null> {
    const sql = `Select sigla from fk2_tb_tipo_candidatura where id = :tipoCandidatura`;
    const result = await this.dataSource.query(sql, { tipoCandidatura } as any);
    if (!result || result.length === 0) return null;
    return result[0]?.SIGLA ?? null;
  }

  async findDocentes({ nome, tipoCandidatura }: FindDocentesDTO) {
    let siglaGrauAcademico: string | null = null;

    if (tipoCandidatura) {
      const siglaTipoCandidatura =
        await this.findSiglaTipoCandidatura(tipoCandidatura);

      if (
        siglaTipoCandidatura &&
        SIGLAS_QUE_EXIGEM_DOUTOR.has(siglaTipoCandidatura)
      ) {
        siglaGrauAcademico = GrauAcademicoSigla.DOUTOR;
      }
    }

    const sqlDocentes = `
      select
          td.codigo                 as codigo,
          tu.pk_utilizador          as codigoUtilizador,
          tu.email                  as email,
          tu.username               as username,
          tu.nome                   as nome,
          td.n_mecanografico        as nMecanografico,
          td.fk_escalao             as codigoEscalao,
          td.tb_categoria_docente   as codigoCategoria,
          nvl(cd.designacao, '-')   as descricaoCategoria,
          nvl(ed.designacao, '-')   as descricaoEscalao,
          nvl(ga.designacao, '-')   as descricaoGrauAcademico
      from FK2_MGD_TB_DOCENTE td
      inner join FK2_MCA_TB_UTILIZADOR tu
        on json_value(td.CODIGO_UTILIZADOR, '$.pk') = tu.PK_UTILIZADOR
      left join FK2_TB_ESCALAO_DOCENTE ed on ed.codigo = td.FK_ESCALAO
      left join FK2_TB_CATEGORIA_DOCENTE cd on cd.codigo = td.TB_CATEGORIA_DOCENTE
      left join FK2_MGD_TB_CANDIDATURA ccc on ccc.codigo = td.FK_CANDIDATURA
      left join FK2_TB_GRAU_ACADEMICO ga on ga.codigo = ccc.GRAU_ACADEMICO
      where 1=1
      and (upper(tu.nome) like upper('%' || :nome || '%') or :nome is null)
      and (ga.sigla = :sigla or :sigla is null)
    `;

    const params = {
      nome: nome?.trim() || null,
      sigla: siglaGrauAcademico,
    };

    try {
      const result = await this.dataSource.query(sqlDocentes, params as any);

      return {
        data: await toLowerCaseKeys(result),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro inesperado ao buscar docentes: ' + error.message,
      );
    }
  }
}
