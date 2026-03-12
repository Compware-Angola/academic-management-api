import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';
import { FindDisciplinasDto } from './dto/find-disciplinas.dto';
import { CreateDisciplinaDto } from './dto/create-discipline.dto';
import { UpdateDisciplinaDto } from './dto/update-discipline.dto';
import { FindGradeCurricularDto } from './dto/FindGradeCurricularDto';

@Injectable()
export class DisciplineService {
        constructor(private readonly dataSource: DataSource) { }
        async findGradeCurricularAluno({
                matriculaId,
                semestre,
                anoLectivo,
                limit = 25,
                page = 1,
        }: FindDisciplinaAlunoDTO) {
                const offset = (page - 1) * limit;

                const baseWhere = `
    al.codigo_matricula = ${matriculaId}
    AND g.status_ = 1
    AND cfr.codigo_ano_lectivo = ${anoLectivo}
    ${semestre ? `AND s.codigo = ${semestre}` : ''}
  `;

                const sql = `
    SELECT DISTINCT
      d.designacao        AS disciplina,
      d.codigo_disciplina AS codigo_disciplina,
      s.designacao        AS semestre,
      dur.designacao      AS duracao,
      c.designacao        AS classe,
      ano.designacao      AS ano_lectivo,
      hr.designacao       AS horario,
      hr.pk_horario       AS codigo_horario,
      gcs.designacao      AS estado,
      sl.designacao       AS sala
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
      INNER JOIN FK2_TB_GRADE_CURRICULAR g
              ON al.CODIGO_GRADE_CURRICULAR = g.codigo
      INNER JOIN FK2_TB_DISCIPLINAS d
              ON d.codigo = g.codigo_disciplina
      INNER JOIN FK2_TB_CLASSES c
              ON c.codigo = g.codigo_classe
      INNER JOIN FK2_TB_CURSOS cur
              ON cur.codigo = g.codigo_curso
      INNER JOIN FK2_TB_SEMESTRES s
              ON s.codigo = g.codigo_semestre
      INNER JOIN FK2_TB_DURACAO dur
              ON dur.codigo = d.duracao
      INNER JOIN FK2_TB_CONFIRMACOES cfr
              ON cfr.codigo = al.codigo_confirmacao
      INNER JOIN FK2_TB_ANO_LECTIVO ano
              ON ano.codigo = cfr.codigo_ano_lectivo
      LEFT JOIN FK2_MGH_TB_HORARIO hr
              ON hr.pk_horario = json_value(al.ref_horario, '$.pk')
      LEFT JOIN FK2_MGH_TB_AULA au
              ON au.fk_horario = hr.pk_horario
      LEFT JOIN FK2_TB_STATUS_GRADE_CURRICULAR gcs
              ON gcs.codigo   = al.codigo_status_grade_curricular
      LEFT JOIN FK2_TB_SALAS sl
              ON sl.codigo = json_value(au.ref_sala, '$.pk')
    WHERE ${baseWhere}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

                const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT d.codigo_disciplina
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
        INNER JOIN FK2_TB_GRADE_CURRICULAR g
                ON al.CODIGO_GRADE_CURRICULAR = g.codigo
        INNER JOIN FK2_TB_DISCIPLINAS d
                ON d.codigo = g.codigo_disciplina
        INNER JOIN FK2_TB_SEMESTRES s
                ON s.codigo = g.codigo_semestre
        INNER JOIN FK2_TB_CONFIRMACOES cfr
                ON cfr.codigo = al.codigo_confirmacao
      WHERE ${baseWhere}
    )
  `;

                const [result, countResult] = await Promise.all([
                        this.dataSource.query(sql),
                        this.dataSource.query(sqlCount),
                ]);

                const total = Number(countResult[0].TOTAL);
                const totalPages = Math.ceil(total / limit);

                return {
                        data: await toLowerCaseKeys(result),
                        total,
                        page,
                        limit,
                        totalPages,
                };
        }

        async findDisciplinas(dto: FindDisciplinasDto) {
                const {
                        tipoUnidadeCurricular,
                        naturezaUnidadeCurricular,
                        status,
                        search,
                        page = 1,
                        limit = 25,
                } = dto;

                const offset = (page - 1) * limit;
                const conditions: string[] = [];
                const params: Record<string, any> = {};

                if (tipoUnidadeCurricular) {
                        conditions.push('d.TIPO_UNIDADE_CURRICULAR = :tipoUnidadeCurricular');
                        params.tipoUnidadeCurricular = tipoUnidadeCurricular;
                }

                if (naturezaUnidadeCurricular) {
                        conditions.push('d.NATUREZA_UNIDADE_CURRICULAR = :naturezaUnidadeCurricular');
                        params.naturezaUnidadeCurricular = naturezaUnidadeCurricular;
                }

                if (status !== undefined) {
                        conditions.push('d.STATUS_ = :status');
                        params.status = status;
                }

                if (search) {
                        conditions.push(
                                '(UPPER(d.DESIGNACAO) LIKE UPPER(:search) OR UPPER(d.NOME_ABREVIATURA) LIKE UPPER(:search))'
                        );
                        params.search = `%${search}%`;
                }

                const whereClause =
                        conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

                const sql = `
    SELECT
      d.CODIGO,
      d.DESIGNACAO,
      d.NOME_ABREVIATURA,
      d.CODIGO_DISCIPLINA,
      d.DURACAO,
      d.TIPO_UNIDADE_CURRICULAR,
      d.NATUREZA_UNIDADE_CURRICULAR,
      d.CODIGO_TIPO_UC,
      d.CODIGO_NATUREZA_UC,
      d.STATUS_,
       d.DATA_REGISTO AS data_registo,
     d.DATA_ULTIMA_ATUALIZACAO AS data_ultima_atualizacao
    FROM FK2_TB_DISCIPLINAS d
    ${whereClause}
    ORDER BY d.DESIGNACAO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

                const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_TB_DISCIPLINAS d
    ${whereClause}
  `;

                try {
                        const [records, countResult] = await Promise.all([
                                this.dataSource.query(sql, params as any),
                                this.dataSource.query(countSql, params as any),
                        ]);

                        const total = Number(countResult?.[0]?.TOTAL ?? 0);

                        return {
                                data: toLowerCaseKeys(records),
                                total,
                                page,
                                limit,
                                totalPages: total > 0 ? Math.ceil(total / limit) : 1,
                        };
                } catch (error) {
                        console.error('Erro ao buscar disciplinas:', error);
                        throw new InternalServerErrorException(`Falha ao buscar disciplinas: ${error.message}`);
                }
        }


        async createDisciplina(dto: CreateDisciplinaDto, pkUtilizador: number) {
                const {
                        designacao,

                        tipoUnidadeCurricular,
                        naturezaUnidadeCurricular,
                        codigoDisciplina,
                        nomeAbreviatura,
                } = dto;



                const sql = `
    INSERT INTO FK2_TB_DISCIPLINAS (
     
      DESIGNACAO,
      DATA_REGISTO,
      TIPO_UNIDADE_CURRICULAR,
      NATUREZA_UNIDADE_CURRICULAR,
      DATA_ULTIMA_ATUALIZACAO,
      USER_,
      DURACAO,
      CODIGO_DISCIPLINA,
      NOME_ABREVIATURA
    ) VALUES (
     
      :designacao,
      SYSDATE,
      :tipoUnidadeCurricular,
      :naturezaUnidadeCurricular,
      SYSDATE,
      :pkUtilizador,
      1,
      :codigoDisciplina,
      :nomeAbreviatura
    )
  `;

                const params = {

                        designacao,
                        tipoUnidadeCurricular,
                        naturezaUnidadeCurricular,
                        pkUtilizador,
                        codigoDisciplina: codigoDisciplina ?? null,
                        nomeAbreviatura: nomeAbreviatura ?? null,
                };

                try {
                        await this.dataSource.query(sql, params as any);

                        return {
                                message: 'Disciplina criada com sucesso.',

                        };
                } catch (error) {
                        console.error('Erro ao criar disciplina:', error);
                        throw new InternalServerErrorException(
                                `Erro ao cadastrar disciplina: ${error.message}`
                        );
                }
        }

        // Service
        async updateDisciplina(codigo: number, dto: UpdateDisciplinaDto, pkUtilizador: number) {
                const fields: string[] = [];
                const params: Record<string, any> = { codigo };

                if (dto.designacao !== undefined) {
                        fields.push('DESIGNACAO = :designacao');
                        params.designacao = dto.designacao;
                }
                if (pkUtilizador !== undefined) {
                        fields.push('USER_ = :pkUtilizador');
                        params.pkUtilizador = pkUtilizador;
                }
                if (dto.tipoUnidadeCurricular !== undefined) {
                        fields.push('TIPO_UNIDADE_CURRICULAR = :tipoUnidadeCurricular');
                        params.tipoUnidadeCurricular = dto.tipoUnidadeCurricular;
                }
                if (dto.naturezaUnidadeCurricular !== undefined) {
                        fields.push('NATUREZA_UNIDADE_CURRICULAR = :naturezaUnidadeCurricular');
                        params.naturezaUnidadeCurricular = dto.naturezaUnidadeCurricular;
                }
                if (dto.codigoDisciplina !== undefined) {
                        fields.push('CODIGO_DISCIPLINA = :codigoDisciplina');
                        params.codigoDisciplina = dto.codigoDisciplina;
                }
                if (dto.nomeAbreviatura !== undefined) {
                        fields.push('NOME_ABREVIATURA = :nomeAbreviatura');
                        params.nomeAbreviatura = dto.nomeAbreviatura;
                }
                if (dto.duracao !== undefined) {
                        fields.push('DURACAO = :duracao');
                        params.duracao = dto.duracao;
                }
                if (dto.status !== undefined) {
                        fields.push('STATUS_ = :status');
                        params.status = dto.status;
                }

                if (fields.length === 0) {
                        throw new BadRequestException('Nenhum campo fornecido para atualização.');
                }

                // Sempre atualiza DATA_ULTIMA_ATUALIZACAO
                fields.push('DATA_ULTIMA_ATUALIZACAO = SYSDATE');

                const sql = `
    UPDATE FK2_TB_DISCIPLINAS
    SET ${fields.join(',\n    ')}
    WHERE CODIGO = :codigo
  `;

                try {
                        await this.dataSource.query(sql, params as any);
                        return {
                                message: 'Disciplina atualizada com sucesso.',
                                codigo,
                                camposAtualizados: fields.length - 1,
                        };
                } catch (error) {
                        if (
                                error instanceof NotFoundException ||
                                error instanceof BadRequestException
                        ) {
                                throw error;
                        }
                        console.error('Erro ao atualizar disciplina:', error);
                        throw new InternalServerErrorException(
                                `Erro ao atualizar disciplina: ${error.message}`
                        );
                }
        }
        // Service
        async findGradeCurricular(dto: FindGradeCurricularDto) {
                const {
                        classe,
                        curso,
                        anoLectivo,
                        page = 1,
                        limit = 25,
                } = dto;

                const offset = (page - 1) * limit;
                const conditions: string[] = ['1=1'];
                const params: Record<string, any> = {};

                if (classe) {
                        conditions.push('gc.CODIGO_CLASSE = :classe');
                        params.classe = classe;
                }

                if (curso) {
                        conditions.push('gc.Codigo_Curso = :curso');
                        params.curso = curso;
                }

                const whereClause = conditions.join(' AND ');

                const sql = `
    SELECT
      plc.Codigo       AS codigo,
      dd.CODIGO         AS codigo_disciplina,
      dd.DESIGNACAO     AS descricao_disciplina,
      cc.DESIGNACAO     AS descricao_curso,
      cc.CODIGO         AS codigo_curso,
      cl.DESIGNACAO     AS descricao_classe,
      cl.CODIGO         AS codigo_classe,
      ss.CODIGO         AS codigo_semestre,
      ss.DESIGNACAO     AS designacao_semestre
    FROM FK2_TB_PLANO_CURRICULAR_CURSO plc
    inner join FK2_TB_PLANO_CURRICULAR_GRADE pcg  on pcg.CODIGO_PLANO_CURRICULAR_CURSO  = plc.CODIGO 
     inner join FK2_TB_GRADE_CURRICULAR gc on gc.Codigo = pcg.codigo_grade_curricular
    INNER JOIN FK2_TB_DISCIPLINAS dd ON dd.CODIGO = gc.Codigo_Disciplina
    INNER JOIN FK2_TB_CURSOS cc      ON cc.CODIGO = gc.Codigo_Curso
    INNER JOIN FK2_TB_CLASSES cl     ON cl.CODIGO = gc.CODIGO_CLASSE 
    INNER JOIN FK2_TB_SEMESTRES ss   ON ss.CODIGO = gc.Codigo_Semestre
   
    WHERE ${whereClause}
    ORDER BY cc.DESIGNACAO ASC, cl.DESIGNACAO ASC, ss.CODIGO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

                const countSql = `
SELECT COUNT(DISTINCT gc.CODIGO) AS total
FROM FK2_TB_PLANO_CURRICULAR_CURSO plc
INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pcg  
  ON pcg.CODIGO_PLANO_CURRICULAR_CURSO = plc.CODIGO
INNER JOIN FK2_TB_GRADE_CURRICULAR gc 
  ON gc.CODIGO = pcg.CODIGO_GRADE_CURRICULAR
INNER JOIN FK2_TB_DISCIPLINAS dd 
  ON dd.CODIGO = gc.CODIGO_DISCIPLINA
INNER JOIN FK2_TB_CURSOS cc      
  ON cc.CODIGO = gc.CODIGO_CURSO
INNER JOIN FK2_TB_CLASSES cl     
  ON cl.CODIGO = gc.CODIGO_CLASSE 
INNER JOIN FK2_TB_SEMESTRES ss   
  ON ss.CODIGO = gc.CODIGO_SEMESTRE
WHERE ${whereClause}
`;

                try {
                        const [records, countResult] = await Promise.all([
                                this.dataSource.query(sql, params as any),
                                this.dataSource.query(countSql, params as any),
                        ]);

                        const total = Number(countResult?.[0]?.TOTAL ?? 0);

                        return {
                                data: toLowerCaseKeys(records),
                                total,
                                page,
                                limit,
                                totalPages: total > 0 ? Math.ceil(total / limit) : 1,
                        };
                } catch (error) {
                        console.error('Erro ao buscar grade curricular:', error);
                        throw new InternalServerErrorException(
                                `Erro ao buscar grade curricular: ${error.message}`
                        );
                }
        }

}
