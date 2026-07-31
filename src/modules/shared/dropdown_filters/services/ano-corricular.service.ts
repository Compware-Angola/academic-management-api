import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';

interface AnoCurricular {
  codigo: number;
  designacao: string;
}

@Injectable()
export class AnoCurriculareService {
  constructor(private readonly dataSource: DataSource) {}

  async getAnoCurriculare(codigoCurso: number): Promise<AnoCurricular[]> {
    try {
      // --------------------------------------------------------------
      // 1. Buscar dados do curso
      // --------------------------------------------------------------
      const cursoSql = `
        SELECT
          c.DURACAO     AS duracao,
          c.TIPO_CURSO  AS tipo_curso
        FROM FK2_TB_CURSOS c
        WHERE c.CODIGO = :codigoCurso
          AND c.STATUS_ = 1
      `;

      const cursoRows = await this.dataSource.query(cursoSql, [codigoCurso]);

      // Curso não encontrado -> lista vazia (equivalente ao NO_DATA_FOUND da procedure)
      if (!cursoRows || cursoRows.length === 0) {
        return [];
      }

      const curso = toLowerCaseKeys(cursoRows)[0];
      const duracao = Number(curso.duracao);
      const tipoCurso = Number(curso.tipo_curso);

      // --------------------------------------------------------------
      // 2. Verificar se o curso é uma especialidade e tem curso base
      // --------------------------------------------------------------
      const baseSql = `
        SELECT cb.DURACAO AS duracao_base
        FROM FK2_TB_CURSO_ESPECIALIDADE ce
        INNER JOIN FK2_TB_CURSOS cb
          ON cb.CODIGO = ce.CODIGO_CURSO
        WHERE ce.CODIGO_CURSO_ESPECIALIDADE = :codigoCurso
          AND cb.STATUS_ = 1
          AND ROWNUM = 1
      `;

      const baseRows = await this.dataSource.query(baseSql, [codigoCurso]);
      const duracaoCursoBase =
        baseRows && baseRows.length > 0
          ? Number(toLowerCaseKeys(baseRows)[0].duracao_base)
          : 0;

      // --------------------------------------------------------------
      // 3. Tipo de curso 2 ou 3 -> lógica de especialidade
      // --------------------------------------------------------------
      if (tipoCurso === 2 || tipoCurso === 3) {
        if (duracaoCursoBase > 0) {
          // Ex: curso base = 3 anos, especialidade = 1 ano -> 4º ano
          const anoCalculado = duracaoCursoBase + duracao;

          return [
            {
              codigo: anoCalculado,
              designacao: `${anoCalculado}º Ano`,
            },
          ];
        }

        // Sem curso base -> usa apenas a duração da especialidade
        return [
          {
            codigo: duracao,
            designacao: `${duracao}º Ano`,
          },
        ];
      }

      // --------------------------------------------------------------
      // 4. Caso não seja especialidade -> gerar sequência 1..duração
      // --------------------------------------------------------------
      return Array.from({ length: duracao }, (_, index) => {
        const ano = index + 1;
        return {
          codigo: ano,
          designacao: `${ano}º Ano`,
        };
      });
    } catch (error) {
      console.error('Erro ao listar anos curriculares:', error);

      throw new InternalServerErrorException(
        `Falha ao listar anos curriculares: ${error?.message}`,
      );
    }
  }
}