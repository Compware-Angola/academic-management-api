import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import oracledb from 'oracledb';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';
import { FindDisciplinasDto } from './dto/find-disciplinas.dto';
import { CreateDisciplinaDto } from './dto/create-discipline.dto';
import { UpdateDisciplinaDto } from './dto/update-discipline.dto';
import { FindGradeCurricularDto } from './dto/FindGradeCurricularDto';
import { CreateUnidadeCurricularDto } from './dto/create-unidade-curricular.plano.dto';
import { CreateUnidadeCurricularDepartamentoDto } from './dto/create-unidade-curricular-departamento.dto';
import { FindUnidadeCurricularDeptDto } from './dto/find-unidade-curricular-dept.dto';

@Injectable()
export class DisciplineService {
        constructor(private readonly dataSource: DataSource) { }
        async findGradeCurricularAluno({
                matriculaId,
                semestre,
                anoLectivo,
                classes,
                limit = 25,
                page = 1,
        }: FindDisciplinaAlunoDTO) {
                const offset = (page - 1) * limit;

                const baseWhere = `
    al.codigo_matricula = ${matriculaId}
    AND g.status_ = 1
    AND cfr.codigo_ano_lectivo = ${anoLectivo}
    ${semestre ? `AND s.codigo = ${semestre}` : ''}
    ${classes ? `AND g.codigo_classe = ${classes}` : ''}
  `;

                const sql = `
    SELECT DISTINCT
      al.codigo_grade_curricular AS codigo_grade_curricular,
      d.designacao        AS disciplina,
      d.codigo_disciplina AS codigo_disciplina,
      s.designacao        AS semestre,
      dur.designacao      AS duracao,
      c.designacao        AS classe,
        c.codigo            AS codigo_classe,
      ano.designacao      AS ano_lectivo,
      hr.designacao       AS horario,
      hr.pk_horario       AS codigo_horario,
      gcs.designacao      AS estado,
      gcs.codigo          AS estado_codigo,
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

        async findGradeCurricular(dto: FindGradeCurricularDto) {
                const {
                        classe,
                        curso,
                        anoLectivo,
                        search,
                        page = 1,
                        limit = 25,
                } = dto;

                const offset = (page - 1) * limit;
                const conditions: string[] = ['1=1'];
                const params: Record<string, any> = {};
                conditions.push('gc.STATUS_ = 1');

                if (classe) {
                        conditions.push('gc.CODIGO_CLASSE = :classe');
                        params.classe = classe;
                }

                if (curso) {
                        conditions.push('gc.Codigo_Curso = :curso');
                        params.curso = curso;
                }
                if (anoLectivo) {
                        conditions.push('plc.CODIGO_ANO_LECTIVO = :anoLectivo');
                        params.anoLectivo = anoLectivo;
                }
                if (search) {
                        conditions.push('UPPER( dd.DESIGNACAO) LIKE UPPER(:search)');
                        params.search = `%${search}%`;
                }

                const whereClause = conditions.join(' AND ');

                const sql = `
    SELECT
      plc.Codigo       AS codigo_plano_curricular,
      gc.Codigo         AS codigo_grade_curricular,
      dd.CODIGO         AS codigo_disciplina,
      dd.DESIGNACAO     AS descricao_disciplina,
      cc.DESIGNACAO     AS descricao_curso,
      cc.CODIGO         AS codigo_curso,
      cl.DESIGNACAO     AS descricao_classe,
      cl.CODIGO         AS codigo_classe,
      ss.CODIGO         AS codigo_semestre,
      ss.DESIGNACAO     AS designacao_semestre
    FROM FK2_TB_PLANO_CURRICULAR_CURSO plc
    INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pcg  on pcg.CODIGO_PLANO_CURRICULAR_CURSO  = plc.CODIGO 
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc on gc.Codigo = pcg.codigo_grade_curricular
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

        async listarUnidadeCurricularDept(dto: FindUnidadeCurricularDeptDto) {
                const {
                        departamento,
                        classe,
                        semestre,
                        estado=1,
                        search,
                        page = 1,
                        limit = 25,
                } = dto;


                const offset = (page - 1) * limit;
                const conditions: string[] = ['1=1'];
                const params: Record<string, any> = {};

                if (departamento) {
                        conditions.push('gc.FK_DEPARTAMENTO = :departamento');
                        params.departamento = departamento;
                }

                if (classe) {
                        conditions.push('gc.CODIGO_CLASSE = :classe');
                        params.classe = classe;
                }

                if (semestre) {
                        conditions.push('gc.CODIGO_SEMESTRE = :semestre');
                        params.semestre = semestre;
                }

                if (search) {
                        conditions.push('UPPER(dic.DESIGNACAO) LIKE UPPER(:search)');
                        params.search = `%${search}%`;
                }
                if (estado !== undefined && estado !== null) {
                        console.log(estado, "ppp");

                        conditions.push('gc.STATUS_ = :estado');
                        params.estado = estado;
                }

                const whereClause = 'WHERE ' + conditions.join(' AND ');

                const sql = `
    SELECT
      gc.CODIGO                     AS codigo_grade,
      gc.CODIGO_DISCIPLINA          AS codigo_disciplina,
      dic.DESIGNACAO                AS unidade_curricular,
      cc.CODIGO                     AS codigo_classe,
      cc.DESIGNACAO                 AS ano_curricular,
      ss.CODIGO                     AS codigo_semestre,
      ss.DESIGNACAO                 AS semestre,
      gc.FK_DEPARTAMENTO            AS codigo_departamento,
      gc.STATUS_                    AS status
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dic ON dic.CODIGO = gc.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CLASSES cc      ON cc.CODIGO  = gc.CODIGO_CLASSE
    INNER JOIN FK2_TB_SEMESTRES ss    ON ss.CODIGO  = gc.CODIGO_SEMESTRE
    ${whereClause}
    ORDER BY dic.DESIGNACAO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

                const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dic ON dic.CODIGO = gc.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CLASSES cc      ON cc.CODIGO  = gc.CODIGO_CLASSE
    INNER JOIN FK2_TB_SEMESTRES ss    ON ss.CODIGO  = gc.CODIGO_SEMESTRE
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
                        console.error('Erro ao listar unidades curriculares do departamento:', error);
                        throw new InternalServerErrorException(
                                `Erro ao listar unidades curriculares: ${error.message}`
                        );
                }
        }


        async adicionarUnidadeCurricularNoPlano(dto: CreateUnidadeCurricularDto, codigoUtilizador: number) {
                const {
                        codigoDisciplina,
                        codigoAnoLectivo,
                        codigoSemestre,
                        codigoClasse,
                        codigoCurso,
                } = dto;

                // 1. Verificar se a disciplina existe
                const disciplinaResult = await this.dataSource.query(
                        `SELECT COUNT(*) AS total FROM FK2_TB_DISCIPLINAS WHERE CODIGO = :codigoDisciplina`,
                        { codigoDisciplina } as any
                );

                if (Number(disciplinaResult?.[0]?.TOTAL) === 0) {
                        throw new NotFoundException('Não foi encontrado disciplina.');
                }

                // 2. Verificar se existe plano do curso
                let codigoPlanoCurso: number;
                try {
                        codigoPlanoCurso = await this.getPlanoCurso(codigoCurso, codigoAnoLectivo);

                        if (!codigoPlanoCurso || codigoPlanoCurso < 0) {
                                throw new NotFoundException('Não foi encontrado plano do curso.');
                        }
                } catch (error) {
                        if (error instanceof NotFoundException) throw error;
                        throw new NotFoundException('Não foi encontrado plano do curso.');
                }

                // 3. Obter grade curricular caso exista
                const gradeResult = await this.dataSource.query(
                        `
    SELECT CODIGO
    FROM FK2_TB_GRADE_CURRICULAR
    WHERE CODIGO_DISCIPLINA = :codigoDisciplina
      AND CODIGO_CURSO       = :codigoCurso
      AND CODIGO_SEMESTRE    = :codigoSemestre
    FETCH FIRST 1 ROWS ONLY
    `,
                        { codigoDisciplina, codigoCurso, codigoSemestre } as any
                );

                let codigoGrade: number | null = gradeResult?.[0]?.CODIGO
                        ? Number(gradeResult[0].CODIGO)
                        : null;

                if (codigoGrade !== null) {
                        // 4a. Grade já existe — verificar se está vinculada a um departamento
                        const existDeptResult = await this.dataSource.query(
                                `
      SELECT COUNT(*) AS total
      FROM FK2_TB_GRADE_CURRICULAR d
      INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg
              ON pg.CODIGO_GRADE_CURRICULAR = d.CODIGO
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pcc
              ON pcc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_CURSOS c
              ON c.CODIGO = pcc.CODIGO_CURSO
      WHERE d.FK_DEPARTAMENTO IS NOT NULL
        AND d.CODIGO_DISCIPLINA = :codigoDisciplina
        AND d.CODIGO_SEMESTRE   = :codigoSemestre
        AND c.CODIGO            = :codigoCurso
        AND d.STATUS_           = 1
      `,
                                { codigoDisciplina, codigoSemestre, codigoCurso } as any
                        );

                        if (Number(existDeptResult?.[0]?.TOTAL) > 0) {
                                throw new BadRequestException(
                                        'Esta grade já está vinculada a um departamento.'
                                );
                        }

                        // 5a. Verificar se já existe no plano
                        const existPlanoResult = await this.dataSource.query(
                                `
      SELECT COUNT(*) AS total
      FROM FK2_TB_PLANO_CURRICULAR_GRADE u
      JOIN FK2_TB_GRADE_CURRICULAR g
          ON g.CODIGO = u.CODIGO_GRADE_CURRICULAR
      JOIN FK2_TB_CLASSES c
          ON c.CODIGO = g.CODIGO_CLASSE
      WHERE u.CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
        AND g.CODIGO = :codigoGrade
        AND c.CODIGO = :codigoClasse
      `,
                                { codigoPlanoCurso, codigoGrade, codigoClasse } as any
                        );

                        if (Number(existPlanoResult?.[0]?.TOTAL) > 0) {
                                // Grade já está no plano — reativar
                                await this.ativegrade(codigoGrade)

                                return {
                                        message: 'Grade curricular reativada com sucesso.',
                                        codigo: codigoGrade,
                                };
                        }

                        // 6a. Não está no plano — adicionar ao plano
                        await this.ativegrade(codigoGrade)
                        await this.adicionarPlano(codigoUtilizador, codigoGrade, codigoPlanoCurso);

                } else {
                        // 4b. Grade não existe — criar grade curricular
                        codigoGrade = await this.criarGradeCurricular({
                                codigoDisciplina,
                                codigoAnoLectivo,
                                codigoClasse,
                                codigoCurso,
                                codigoUtilizador,
                                codigoSemestre,
                                departamento: null,
                        });

                        if (!codigoGrade) {
                                throw new InternalServerErrorException('Erro ao criar grade curricular.');
                        }

                        // 5b. Adicionar ao plano
                        await this.adicionarPlano(codigoUtilizador, codigoGrade, codigoPlanoCurso);
                }

                return {
                        message: 'Disciplina cadastrada na grade com sucesso.',
                        codigo: codigoGrade,
                };
        }
        async removerUnidadeCurricularDoPlano(codigoGrade: number) {
    // 1. Verificar se a grade existe
    const gradeResult = await this.dataSource.query(
        `SELECT COUNT(*) AS total FROM FK2_TB_GRADE_CURRICULAR WHERE CODIGO = :codigoGrade`,
        { codigoGrade } as any
    );

    if (Number(gradeResult?.[0]?.TOTAL) === 0) {
        throw new NotFoundException('Grade curricular não encontrada.');
    }

    // 2. Desativar a grade
    await this.inativegrade(codigoGrade);

    return {
        message: 'UC Removida Com Sucesso',
        codigo: codigoGrade,
    };
}

        async adicionarUnidadeCurricularNoDepartamento(
                dto: CreateUnidadeCurricularDepartamentoDto,
        ) {
                const {
                        codigoDisciplina,
                        codigoAnoLectivo,
                        codigoSemestre,
                        codigoClasse,
                        codigoDepartamento,
                        codigoUtilizador,
                        cursos,
                } = dto;

                // 1. Verificar se a disciplina existe
                const disciplinaResult = await this.dataSource.query(
                        `SELECT COUNT(*) AS total FROM FK2_TB_DISCIPLINAS WHERE CODIGO = :codigoDisciplina`,
                        { codigoDisciplina } as any
                );

                if (Number(disciplinaResult?.[0]?.TOTAL) === 0) {
                        throw new NotFoundException('Não foi encontrada a disciplina.');
                }

                const resultados: { codigoCurso: number; status: string; mensagem: string }[] = [];

                // 2. Iterar sobre os cursos
                for (const { codigoCurso } of cursos) {
                        const resultado = {
                                codigoCurso,
                                status: 'sucesso',
                                mensagem: '',
                        };

                        try {
                                // 2a. Verificar se a disciplina já está no plano do curso
                                const existPlanoResult = await this.dataSource.query(
                                        `
        SELECT gc.CODIGO
        FROM FK2_TB_PLANO_CURRICULAR_GRADE p
        JOIN FK2_TB_PLANO_CURRICULAR_CURSO pc ON pc.CODIGO = p.CODIGO_PLANO_CURRICULAR_CURSO
        JOIN FK2_TB_CURSOS c                  ON c.CODIGO  = pc.CODIGO_CURSO
        JOIN FK2_TB_GRADE_CURRICULAR gc       ON gc.CODIGO = p.CODIGO_GRADE_CURRICULAR
        JOIN FK2_TB_DISCIPLINAS d             ON d.CODIGO  = gc.CODIGO_DISCIPLINA
        JOIN FK2_TB_ANO_LECTIVO al            ON al.CODIGO = pc.CODIGO_ANO_LECTIVO
        WHERE d.CODIGO  = :codigoDisciplina
          AND al.CODIGO = :codigoAnoLectivo
          AND c.CODIGO  = :codigoCurso
        FETCH FIRST 1 ROWS ONLY
        `,
                                        { codigoDisciplina, codigoAnoLectivo, codigoCurso } as any
                                );

                                if (existPlanoResult?.length > 0) {
                                        // Já está no plano — reativar por precaução
                                        const codigoGradeExistente = Number(existPlanoResult[0].CODIGO);

                                        await this.ativegrade(codigoGradeExistente)

                                        resultado.status = 'ignorado';
                                        resultado.mensagem = 'Esta grade já está vinculada ao plano do curso. Reativada por precaução.';
                                        resultados.push(resultado);
                                        continue;
                                }

                                // 2b. Verificar se já existe no departamento
                                const existDeptResult = await this.dataSource.query(
                                        `
        SELECT COUNT(*) AS total
        FROM FK2_TB_GRADE_CURRICULAR g
        WHERE g.FK_DEPARTAMENTO   = :codigoDepartamento
          AND g.CODIGO_CLASSE     = :codigoClasse
          AND g.CODIGO_CURSO      = :codigoCurso
          AND g.CODIGO_DISCIPLINA = :codigoDisciplina
          AND g.CODIGO_SEMESTRE   = :codigoSemestre
        `,
                                        { codigoDepartamento, codigoClasse, codigoCurso, codigoDisciplina, codigoSemestre } as any
                                );

                                const existeNoDept = Number(existDeptResult?.[0]?.TOTAL) > 0;

                                if (existeNoDept) {
                                        // 2c. Já existe no dept — reactivar (status = 1)
                                        await this.dataSource.query(
                                                `
          UPDATE FK2_TB_GRADE_CURRICULAR
          SET STATUS_ = 1
          WHERE FK_DEPARTAMENTO   = :codigoDepartamento
            AND CODIGO_CLASSE     = :codigoClasse
            AND CODIGO_CURSO      = :codigoCurso
            AND CODIGO_DISCIPLINA = :codigoDisciplina
            AND CODIGO_SEMESTRE   = :codigoSemestre
          `,
                                                { codigoDepartamento, codigoClasse, codigoCurso, codigoDisciplina, codigoSemestre } as any
                                        );
                                        resultado.mensagem = 'Grade reactivada no departamento.';
                                } else {
                                        // 2d. Não existe — criar grade curricular com departamento
                                        const codigoGrade = await this.criarGradeCurricular({
                                                codigoDisciplina,
                                                codigoAnoLectivo,
                                                codigoClasse,
                                                codigoCurso,
                                                codigoUtilizador,
                                                codigoSemestre,
                                                departamento: codigoDepartamento,
                                        });

                                        // Pegar id do plano do curso
                                        const codigoPlanoCurso = await this.getPlanoCurso(codigoCurso, codigoAnoLectivo);

                                        // Adicionar no plano
                                        await this.adicionarPlano(codigoUtilizador, codigoGrade, codigoPlanoCurso);
                                        resultado.mensagem = 'Grade criada no departamento.';
                                }

                        } catch (error) {
                                resultado.status = 'erro';
                                resultado.mensagem = error.message;
                        }

                        resultados.push(resultado);
                }

                const comSucesso = resultados.filter(r => r.status === 'sucesso');
                const ignorados = resultados.filter(r => r.status === 'ignorado');
                const comErro = resultados.filter(r => r.status === 'erro');

                return {
                        message: 'Processamento concluído.',
                        total: resultados.length,
                        sucesso: comSucesso.length,
                        ignorados: ignorados.length,
                        erros: comErro.length,
                        detalhes: resultados,
                };
        }
        // ─── Helpers privados ───────────────────────────────────────────────────────


        private async ativegrade(codigoGrade: number) {

                await this.dataSource.query(
                        `
      UPDATE FK2_TB_GRADE_CURRICULAR
      SET STATUS_ = 1
      WHERE CODIGO = :codigoGrade
      `,
                        { codigoGrade } as any
                );
        }
         private async inativegrade(codigoGrade: number) {

                await this.dataSource.query(
                        `
      UPDATE FK2_TB_GRADE_CURRICULAR
      SET STATUS_ = 0
      WHERE CODIGO = :codigoGrade
      `,
                        { codigoGrade } as any
                );
        }

        private async criarGradeCurricular(params: {
                codigoDisciplina: number;
                codigoAnoLectivo: number;
                codigoClasse: number;
                codigoCurso: number;
                codigoUtilizador: number;
                codigoSemestre: number;
                departamento: number | null;
        }): Promise<number> {
                const {
                        codigoDisciplina,
                        codigoClasse,
                        codigoCurso,
                        codigoUtilizador,
                        codigoSemestre,
                        departamento,
                } = params;



                const result = await this.dataSource.query(
                        `
    INSERT INTO FK2_TB_GRADE_CURRICULAR (
      CODIGO_CURSO,
      CODIGO_DISCIPLINA,
      CODIGO_CLASSE,
      CODIGO_SEMESTRE,
      HORASTOTAIS,
      HORASTEORICAS,
      HORASTEORICOSPRATICAS,
      HORASPRATICAS,
      DATA_REGISTO,
      DATA_ULTIMAA_ATUALIZACAO,
      USER_,
      HORASESTAGIO,
      HORASSEMINARIO,
      HORASRELATORIO,
      NUM_MAX_FALTAS,
      VALOR_INSCRICAO,
      CANAL,
      STATUS_,
      PESO_PRIMEIRA_FREQ,
      NOTA_MIN_PRIMEIRA_FREQ,
      PESO_SEGUNDA_FREQ,
      NOTA_MIN_SEGUNDA_FREQ,
      PESO_PRATICA,
      NOTA_MIN_PRATICA,
      FORMULA_DEFIDA_POR,
      UTILIZADOR,
      FK_DEPARTAMENTO
    ) VALUES (
      :codigoCurso,
      :codigoDisciplina,
      :codigoClasse,
      :codigoSemestre,
      1, 1, 1, 1,
      SYSDATE,
      SYSDATE,
      :codigoUtilizador,
      1, 1, 1, 1, 0, 1, 1,
      0, 0, 0, 0, 0, 0,
      NULL,
      NULL,
      :departamento
     
    ) RETURNING CODIGO INTO :outId
    `,
                        {
                                codigoCurso,
                                codigoDisciplina,
                                codigoClasse,
                                codigoSemestre,
                                codigoUtilizador,
                                departamento,
                                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                        } as any
                );


                return result?.outId[0];
        }

        private async adicionarPlano(
                codigoUtilizador: number,
                codigoGrade: number,
                codigoPlanoCurso: number
        ): Promise<void> {


                try {
                        await this.dataSource.query(
                                `
      INSERT INTO FK2_TB_PLANO_CURRICULAR_GRADE (
       
        CODIGO_PLANO_CURRICULAR_CURSO,
        CODIGO_GRADE_CURRICULAR,
        DATA,
        CODIGO_UTILIZADOR,
        PESO_PRIMEIRA_FREQ,
        PESO_SEGUNDA_FREQ,
        PESO_PRATICA,
        NOTA_MIN_PRIMEIRA_FREQ,
        NOTA_MIN_SEGUNDA_FREQ,
        NOTA_MIN_PRATICA,
        UTILIZADOR
      ) VALUES (
       
        :codigoPlanoCurso,
        :codigoGrade,
        SYSDATE,
        NULL,
        50,
        50,
        0,
        8,
        8,
        8,
        :codigoUtilizador
      )
      `,
                                { codigoPlanoCurso, codigoGrade, codigoUtilizador } as any
                        );
                } catch (error) {
                        console.error('Erro ao adicionar plano de grade:', error);
                        throw new InternalServerErrorException(
                                `Erro ao adicionar grade no plano: ${error.message}`
                        );
                }
        }
        private async getPlanoCurso(
                codigoCurso: number,
                codigoAnoLectivo: number,
        ): Promise<number> {
                const result = await this.dataSource.query(
                        `
    SELECT CODIGO
    FROM FK2_TB_PLANO_CURRICULAR_CURSO
    WHERE CODIGO_CURSO       = :codigoCurso
      AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    FETCH FIRST 1 ROWS ONLY
    `,
                        { codigoCurso, codigoAnoLectivo } as any
                );

                if (!result || result.length === 0) {
                        throw new NotFoundException(
                                `Plano do curso não encontrado para o curso ${codigoCurso} e ano lectivo ${codigoAnoLectivo}.`
                        );
                }

                return Number(result[0].CODIGO);
        }

}
