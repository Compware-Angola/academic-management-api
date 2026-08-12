import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
import { FindGradeCurricularAdminDto } from './dto/find-grade-curricular-admin.dto';
import { CreateUCTroncoComumPlanoCursoDto } from './dto/create-uc-tronco-comum-plano-curso.dto';
import { CreateUnidadesCurricularesDto } from './dto/add-uc-to-plan.dto';

export class UnidadeCurricularJaNoPlanoException extends ConflictException {
  constructor(
    mensagem: string = 'Esta unidade curricular já se encontra activa no plano curricular.',
  ) {
    super(mensagem);
  }
}
import { ConsultarVinculacaoGradeDto } from './dto/ConsultarVinculacaoGradeDto';

@Injectable()
export class DisciplineService {
  constructor(private readonly dataSource: DataSource) {}
  async findGradeCurricularAluno({
    matriculaId,
    semestre,
    anoLectivo,
    classes,
    limit = 25,
    page = 1,
    ignorarEliminados,
  }: FindDisciplinaAlunoDTO) {
    const offset = (page - 1) * limit;
    const filtroEliminados =
      ignorarEliminados === 1
        ? `AND al.codigo_status_grade_curricular != 5`
        : '';

    /**
     * NOTA (tronco comum): a condição original só considerava a disciplina
     * "pertencente" ao aluno se g.CODIGO_CURSO fosse igual ao curso da
     * matrícula, ou se fosse o curso "base" de uma especialidade. Isto
     * exclui disciplinas de tronco comum, cuja FK2_TB_GRADE_CURRICULAR
     * continua com CODIGO_CURSO do departamento de origem, mesmo depois
     * de vinculada ao plano curricular do curso do aluno via
     * adicionarUcDoDepartamentoParaPlanoCurso.
     *
     * O EXISTS abaixo cobre esse caso: considera a disciplina válida
     * também se existir um vínculo em FK2_TB_PLANO_CURRICULAR_GRADE /
     * FK2_TB_PLANO_CURRICULAR_CURSO ligando essa grade ao plano
     * curricular do curso do aluno (ou do seu curso base, em caso de
     * especialidade).
     */
    const filtroTroncoComum = `
  OR EXISTS (
    SELECT 1
    FROM FK2_TB_PLANO_CURRICULAR_GRADE pg2
    INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc2
      ON pgc2.CODIGO = pg2.CODIGO_PLANO_CURRICULAR_CURSO
    WHERE pg2.CODIGO_GRADE_CURRICULAR = g.codigo
      AND (
        pgc2.CODIGO_CURSO = mat.CODIGO_CURSO
        OR pgc2.CODIGO_CURSO IN (
             SELECT CODIGO_CURSO
             FROM FK2_TB_CURSO_ESPECIALIDADE
             WHERE CODIGO_CURSO_ESPECIALIDADE = mat.CODIGO_CURSO
           )
      )
  )
`;

    /**
     * Classe/semestre "efetivos" da disciplina para o aluno: se a grade
     * estiver vinculada ao plano curricular do curso do aluno através de
     * FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE (caso de tronco comum),
     * usa-se a classe/semestre gravados ali; caso contrário (disciplina
     * nativa, sem registo nessa tabela), cai-se para a classe/semestre
     * da própria grade curricular (g.codigo_classe / g.codigo_semestre).
     * Implementado como subqueries escalares para poder ser reutilizado
     * tanto no SELECT/JOIN principal como no filtro (baseWhere), que é
     * também usado na query de contagem sem os LEFT JOINs extra.
     */
    const classeEfetivaSubquery = `
      COALESCE(
        (SELECT pgs.CODIGO_CLASSE
           FROM FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE pgs
           INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc3
             ON pgc3.CODIGO = pgs.CODIGO_PLANO_CURRICULAR_CURSO
          WHERE pgs.CODIGO_GRADE_CURRICULAR = g.codigo
            AND pgc3.CODIGO_CURSO = mat.CODIGO_CURSO
          FETCH FIRST 1 ROWS ONLY),
        g.codigo_classe
      )
    `;

    const semestreEfetivoSubquery = `
      COALESCE(
        (SELECT pgs.CODIGO_SEMESTRE
           FROM FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE pgs
           INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc3
             ON pgc3.CODIGO = pgs.CODIGO_PLANO_CURRICULAR_CURSO
          WHERE pgs.CODIGO_GRADE_CURRICULAR = g.codigo
            AND pgc3.CODIGO_CURSO = mat.CODIGO_CURSO
          FETCH FIRST 1 ROWS ONLY),
        g.codigo_semestre
      )
    `;

    const baseWhere = `
  al.codigo_matricula = ${matriculaId}
  --AND g.status_ = 1
  AND al.estado != 3
  AND (
    mat.CODIGO_CURSO = g.CODIGO_CURSO
    OR g.CODIGO_CURSO in (select CODIGO_CURSO from FK2_TB_CURSO_ESPECIALIDADE WHERE CODIGO_CURSO_ESPECIALIDADE = mat.CODIGO_CURSO)
    ${filtroTroncoComum}
  )
  AND al.codigo_ano_lectivo = ${anoLectivo}
  ${filtroEliminados}
  ${semestre ? `AND ${semestreEfetivoSubquery} = ${semestre}` : ''}
  ${classes ? `AND ${classeEfetivaSubquery} = ${classes}` : ''}
`;

    const sql = `
    SELECT DISTINCT
      al.codigo AS codigo,
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
      INNER JOIN FK2_TB_MATRICULAS mat
              ON mat.CODIGO = al.CODIGO_MATRICULA
      INNER JOIN FK2_TB_DISCIPLINAS d
              ON d.codigo = g.codigo_disciplina
      INNER JOIN FK2_TB_CLASSES c
              ON c.codigo = ${classeEfetivaSubquery}
      INNER JOIN FK2_TB_CURSOS cur
              ON cur.codigo = g.codigo_curso
      INNER JOIN FK2_TB_SEMESTRES s
              ON s.codigo = ${semestreEfetivoSubquery}
      INNER JOIN FK2_TB_DURACAO dur
              ON dur.codigo = d.duracao
      LEFT JOIN FK2_TB_CONFIRMACOES cfr
              ON cfr.codigo = al.codigo_confirmacao
      INNER JOIN FK2_TB_ANO_LECTIVO ano
              ON ano.codigo = al.codigo_ano_lectivo
      LEFT JOIN FK2_MGH_TB_HORARIO hr
              ON hr.pk_horario = json_value(al.ref_horario, '$.pk')
      LEFT JOIN FK2_MGH_TB_AULA au
              ON au.fk_horario = hr.pk_horario
      LEFT JOIN FK2_TB_STATUS_GRADE_CURRICULAR gcs
              ON gcs.codigo   = al.codigo_status_grade_curricular
      LEFT JOIN FK2_TB_SALAS sl
              ON sl.codigo = json_value(au.ref_sala, '$.pk')
    WHERE ${baseWhere}
    ORDER BY al.codigo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT d.codigo_disciplina
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
        INNER JOIN FK2_TB_GRADE_CURRICULAR g
                ON al.CODIGO_GRADE_CURRICULAR = g.codigo
         INNER JOIN FK2_TB_MATRICULAS mat
              ON mat.CODIGO = al.CODIGO_MATRICULA
        INNER JOIN FK2_TB_DISCIPLINAS d
                ON d.codigo = g.codigo_disciplina
        INNER JOIN FK2_TB_SEMESTRES s
                ON s.codigo = ${semestreEfetivoSubquery}
        LEFT JOIN FK2_TB_CONFIRMACOES cfr
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
      conditions.push(
        'd.NATUREZA_UNIDADE_CURRICULAR = :naturezaUnidadeCurricular',
      );
      params.naturezaUnidadeCurricular = naturezaUnidadeCurricular;
    }

    if (status !== undefined) {
      conditions.push('d.STATUS_ = :status');
      params.status = status;
    }

    if (search) {
      conditions.push(
        '(UPPER(d.DESIGNACAO) LIKE UPPER(:search) OR UPPER(d.NOME_ABREVIATURA) LIKE UPPER(:search))',
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
      throw new InternalServerErrorException(
        `Falha ao buscar disciplinas: ${error.message}`,
      );
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
        `Erro ao cadastrar disciplina: ${error.message}`,
      );
    }
  }

  async updateDisciplina(
    codigo: number,
    dto: UpdateDisciplinaDto,
    pkUtilizador: number,
  ) {
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
        `Erro ao atualizar disciplina: ${error.message}`,
      );
    }
  }

  async findGradeCurricular(dto: FindGradeCurricularDto) {
    const {
      classe,
      curso,
      anoLectivo,
      estado,
      search,
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
    if (anoLectivo) {
      conditions.push('plc.CODIGO_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (estado === 0 || estado === 1) {
      conditions.push('dd.STATUS_ = :estado');
      params.estado = Number(estado);
    } else {
      conditions.push('gc.STATUS_ = 1'); // default: só ativas quando não filtrado
    }
    if (search) {
      conditions.push('UPPER(dd.DESIGNACAO) LIKE UPPER(:search)');
      params.search = `%${search}%`;
    }

    const whereClause = conditions.join(' AND ');

    // Base comum às duas queries: uma linha por grade curricular (rn = 1),
    // escolhendo o plano curricular mais recente (ajusta o ORDER BY do
    // ROW_NUMBER se existir um campo de vigência/status no plano, ex:
    // plc.STATUS_ ou plc.CODIGO_ANO_LECTIVO)
    const baseCte = `
    WITH ranked AS (
      SELECT
        plc.Codigo        AS codigo_plano_curricular,
        plc.DESIGNACAO    AS descricao_plano_curricular,
        gc.Codigo         AS codigo_grade_curricular,
        dd.CODIGO         AS codigo_disciplina,
        dd.DESIGNACAO     AS descricao_disciplina,
        cc.DESIGNACAO     AS descricao_curso,
        cc.CODIGO         AS codigo_curso,
        cl.DESIGNACAO     AS descricao_classe,
        cl.CODIGO         AS codigo_classe,
        ss.CODIGO         AS codigo_semestre,
        ss.DESIGNACAO     AS designacao_semestre,

        pcg.PESO_PRIMEIRA_FREQ     AS peso_primeira_freq,
        pcg.PESO_SEGUNDA_FREQ      AS peso_segunda_freq,
        pcg.PESO_PRATICA           AS peso_pratica,
        pcg.NOTA_MIN_PRIMEIRA_FREQ AS nota_min_primeira_freq,
        pcg.NOTA_MIN_SEGUNDA_FREQ  AS nota_min_segunda_freq,
        pcg.NOTA_MIN_PRATICA       AS nota_min_pratica,

        dd.STATUS_        AS status,
        ROW_NUMBER() OVER (
          PARTITION BY gc.Codigo
          ORDER BY plc.Codigo DESC
        ) AS rn
      FROM FK2_TB_PLANO_CURRICULAR_CURSO plc
      INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pcg ON pcg.CODIGO_PLANO_CURRICULAR_CURSO = plc.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR gc        ON gc.Codigo = pcg.codigo_grade_curricular
      INNER JOIN FK2_TB_DISCIPLINAS dd             ON dd.CODIGO = gc.Codigo_Disciplina
      INNER JOIN FK2_TB_CURSOS cc                  ON cc.CODIGO = gc.Codigo_Curso
      INNER JOIN FK2_TB_CLASSES cl                 ON cl.CODIGO = gc.CODIGO_CLASSE
      INNER JOIN FK2_TB_SEMESTRES ss               ON ss.CODIGO = gc.Codigo_Semestre
      WHERE ${whereClause}
    )
  `;

    const sql = `
    ${baseCte}
    SELECT
      codigo_plano_curricular,
      descricao_plano_curricular,
      codigo_grade_curricular,
      codigo_disciplina,
      descricao_disciplina,
      descricao_curso,
      codigo_curso,
      descricao_classe,
      codigo_classe,
      codigo_semestre,
      designacao_semestre,
      peso_primeira_freq,
      peso_segunda_freq,
      peso_pratica,
      nota_min_primeira_freq,
      nota_min_segunda_freq,
      nota_min_pratica,
      status
    FROM ranked
    WHERE rn = 1
    ORDER BY descricao_curso ASC, descricao_classe ASC, codigo_semestre ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const countSql = `
    ${baseCte}
    SELECT COUNT(*) AS total
    FROM ranked
    WHERE rn = 1
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
        `Erro ao buscar grade curricular: ${error.message}`,
      );
    }
  }

  async adicionarUnidadesCurricularesNoPlano(
    dto: CreateUnidadesCurricularesDto,
    codigoUtilizador: number,
  ) {
    const {
      codigosDisciplina,
      codigoAnoLectivo,
      codigoSemestre,
      codigoClasse,
      codigoCurso,
    } = dto;

    const codigoPlanoCurso = await this.getPlanoCurso(
      codigoCurso,
      codigoAnoLectivo,
    );

    const resultado = {
      adicionadas: [] as { codigoDisciplina: number; codigoGrade: number }[],
      reativadas: [] as { codigoDisciplina: number; codigoGrade: number }[],
      falhas: [] as {
        codigoDisciplina: number;
        motivo: string;
        jaNoPlano: boolean;
      }[],
    };

    for (const codigoDisciplina of codigosDisciplina) {
      try {
        const item = await this.processarDisciplinaNoPlano({
          codigoDisciplina,
          codigoAnoLectivo,
          codigoSemestre,
          codigoClasse,
          codigoCurso,
          codigoPlanoCurso,
          codigoUtilizador,
        });

        if (item.status === 'reativada') {
          resultado.reativadas.push({
            codigoDisciplina,
            codigoGrade: item.codigo,
          });
        } else {
          resultado.adicionadas.push({
            codigoDisciplina,
            codigoGrade: item.codigo,
          });
        }
      } catch (error) {
        resultado.falhas.push({
          codigoDisciplina,
          motivo:
            error instanceof HttpException
              ? error.message
              : 'Erro inesperado ao processar a disciplina.',
          jaNoPlano: error instanceof UnidadeCurricularJaNoPlanoException,
        });
      }
    }

    const totalSucesso =
      resultado.adicionadas.length + resultado.reativadas.length;
    const totalJaNoPlano = resultado.falhas.filter((f) => f.jaNoPlano).length;
    const totalOutrasFalhas = resultado.falhas.length - totalJaNoPlano;

    const partes: string[] = [];
    if (totalSucesso > 0) {
      partes.push(`${totalSucesso} unidade(s) curricular(es) adicionada(s)`);
    }
    if (totalJaNoPlano > 0) {
      partes.push(`${totalJaNoPlano} já se encontrava(m) no plano`);
    }
    if (totalOutrasFalhas > 0) {
      partes.push(`${totalOutrasFalhas} falharam por outro motivo`);
    }
    console.log('Resultado do processamento:', resultado);
    console.log(
      'Resultado do TOtal:',
      totalSucesso,
      totalJaNoPlano,
      totalOutrasFalhas,
    );
    // Só é erro de verdade se houver falhas que NÃO sejam "já no plano"
    // e nada tiver sido processado com sucesso.
    if (totalSucesso === 0 && totalOutrasFalhas > 0 && totalJaNoPlano === 0) {
      throw new BadRequestException({
        message: 'Nenhuma disciplina foi adicionada ao plano.',
        falhas: resultado.falhas,
      });
    }

    return {
      message: partes.join('; ') + '.',
      ...resultado,
    };
  }

  private async processarDisciplinaNoPlano(params: {
    codigoDisciplina: number;
    codigoAnoLectivo: number;
    codigoSemestre: number;
    codigoClasse: number;
    codigoCurso: number;
    codigoPlanoCurso: number;
    codigoUtilizador: number;
  }): Promise<{ codigo: number; status: 'criada' | 'reativada' }> {
    const {
      codigoDisciplina,
      codigoAnoLectivo,
      codigoSemestre,
      codigoClasse,
      codigoCurso,
      codigoPlanoCurso,
      codigoUtilizador,
    } = params;

    // 1. Verificar se a disciplina existe
    const disciplinaResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM FK2_TB_DISCIPLINAS WHERE CODIGO = :codigoDisciplina`,
      { codigoDisciplina } as any,
    );

    if (Number(disciplinaResult?.[0]?.TOTAL) === 0) {
      throw new NotFoundException('Não foi encontrado disciplina.');
    }

    // 1b. Verificar se a disciplina já está vinculada a uma grade de departamento
    const gradeDepartamentoResult = await this.dataSource.query(
      `
  SELECT COUNT(*) AS total
  FROM FK2_TB_GRADE_CURRICULAR
  WHERE CODIGO_DISCIPLINA = :codigoDisciplina
    AND TYPE = 'DEPARTAMENTO'
  `,
      { codigoDisciplina } as any,
    );

    if (Number(gradeDepartamentoResult?.[0]?.TOTAL) > 0) {
      throw new BadRequestException(
        'Esta disciplina já está vinculada a uma grade de departamento.',
      );
    }

    // 2. Obter grade curricular caso exista
    const gradeResult = await this.dataSource.query(
      `
    SELECT CODIGO
    FROM FK2_TB_GRADE_CURRICULAR
    WHERE CODIGO_DISCIPLINA = :codigoDisciplina
      AND CODIGO_CURSO       = :codigoCurso
      AND CODIGO_SEMESTRE    = :codigoSemestre
    FETCH FIRST 1 ROWS ONLY
    `,
      { codigoDisciplina, codigoCurso, codigoSemestre } as any,
    );

    let codigoGrade: number | null = gradeResult?.[0]?.CODIGO
      ? Number(gradeResult[0].CODIGO)
      : null;

    if (codigoGrade !== null) {
      // 3a. Grade já existe — verificar se está vinculada a um departamento
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
        { codigoDisciplina, codigoSemestre, codigoCurso } as any,
      );

      if (Number(existDeptResult?.[0]?.TOTAL) > 0) {
        throw new BadRequestException(
          'Esta grade já está vinculada a um departamento.',
        );
      }

      const existPlanoResult = await this.dataSource.query(
        `
  SELECT g.STATUS_ AS STATUS_VINCULO
  FROM FK2_TB_PLANO_CURRICULAR_GRADE u
  JOIN FK2_TB_GRADE_CURRICULAR g
      ON g.CODIGO = u.CODIGO_GRADE_CURRICULAR
  JOIN FK2_TB_CLASSES c
      ON c.CODIGO = g.CODIGO_CLASSE
  WHERE u.CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
    AND g.CODIGO = :codigoGrade
    AND c.CODIGO = :codigoClasse
  `,
        { codigoPlanoCurso, codigoGrade, codigoClasse } as any,
      );

      const vinculoExistente = existPlanoResult?.[0];

      if (vinculoExistente) {
        const statusVinculo = Number(vinculoExistente.STATUS_VINCULO);

        if (statusVinculo === 1) {
          // Já está activa no plano — não fazer nada e reportar como não adicionada
          throw new UnidadeCurricularJaNoPlanoException();
        }

        // Vínculo existe mas está inactivo — reactivação legítima
        await this.ativegrade(codigoGrade);
        return { codigo: codigoGrade, status: 'reativada' };
      }

      await this.ativegrade(codigoGrade);
      await this.adicionarPlano(
        codigoUtilizador,
        codigoGrade,
        codigoPlanoCurso,
      );
      return { codigo: codigoGrade, status: 'criada' };
    }

    // 3b. Grade não existe — criar grade curricular
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

    await this.adicionarPlano(codigoUtilizador, codigoGrade, codigoPlanoCurso);
    return { codigo: codigoGrade, status: 'criada' };
  }

  // service — método de listagem (todas as linhas, sem dedup por disciplina)

  async findAllGradeCurricular(dto: FindGradeCurricularAdminDto) {
    const {
      curso,
      classe,
      semestre,
      disciplina,
      estado,
      search,
      page = 1,
      limit = 25,
    } = dto;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['1=1'];
    const params: Record<string, any> = {};

    if (curso) {
      conditions.push('gc.CODIGO_CURSO = :curso');
      params.curso = curso;
    }

    if (classe) {
      conditions.push('gc.CODIGO_CLASSE = :classe');
      params.classe = classe;
    }

    if (semestre) {
      conditions.push('gc.CODIGO_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (disciplina) {
      conditions.push('gc.CODIGO_DISCIPLINA = :disciplina');
      params.disciplina = disciplina;
    }

    if (estado === 0 || estado === 1) {
      conditions.push('gc.STATUS_ = :estado');
      params.estado = Number(estado);
    }

    if (search) {
      conditions.push('UPPER(dd.DESIGNACAO) LIKE UPPER(:search)');
      params.search = `%${search}%`;
    }

    const whereClause = conditions.join(' AND ');

    // Sem ROW_NUMBER / dedup aqui de propósito: precisamos ver cada
    // registo de FK2_TB_GRADE_CURRICULAR individualmente (mesmo que a
    // mesma disciplina apareça mais de uma vez, ex: I e II semestre,
    // ou registos duplicados por engano) para poder activar/inactivar
    // cada um separadamente.
    const baseFrom = `
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dd ON dd.CODIGO = gc.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CURSOS cc      ON cc.CODIGO = gc.CODIGO_CURSO
    INNER JOIN FK2_TB_CLASSES cl     ON cl.CODIGO = gc.CODIGO_CLASSE
    INNER JOIN FK2_TB_SEMESTRES ss   ON ss.CODIGO = gc.CODIGO_SEMESTRE
    WHERE ${whereClause}
  `;

    const sql = `
    SELECT
      gc.CODIGO             AS codigo,
      gc.CODIGO_CURSO       AS codigo_curso,
      cc.DESIGNACAO         AS descricao_curso,
      gc.CODIGO_DISCIPLINA  AS codigo_disciplina,
      dd.DESIGNACAO         AS descricao_disciplina,
      gc.CODIGO_CLASSE      AS codigo_classe,
      cl.DESIGNACAO         AS descricao_classe,
      gc.CODIGO_SEMESTRE    AS codigo_semestre,
      ss.DESIGNACAO         AS designacao_semestre,
      gc.HORASTOTAIS        AS horas_totais,
      gc.STATUS_             AS status
    ${baseFrom}
    ORDER BY cc.DESIGNACAO ASC, cl.DESIGNACAO ASC, ss.CODIGO ASC, dd.DESIGNACAO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const countSql = `
    SELECT COUNT(*) AS total
    ${baseFrom}
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
      console.error('Erro ao buscar grades curriculares:', error);
      throw new InternalServerErrorException(
        `Erro ao buscar grades curriculares: ${error.message}`,
      );
    }
  }

  // service — método de toggle (activar/inactivar por CODIGO)

  async toggleStatusGradeCurricular(codigo: number, status: number) {
    const sql = `
    UPDATE FK2_TB_GRADE_CURRICULAR
    SET STATUS_ = :status
    WHERE CODIGO = :codigo
  `;

    try {
      const result = await this.dataSource.query(sql, {
        status,
        codigo,
      } as any);

      // dataSource.query em UPDATE via Oracle não retorna linhas afectadas
      // de forma consistente entre drivers — confirmamos buscando o registo.
      const [updated] = await this.dataSource.query(
        `SELECT CODIGO AS codigo, STATUS_ AS status
       FROM FK2_TB_GRADE_CURRICULAR
       WHERE CODIGO = :codigo`,
        { codigo } as any,
      );

      if (!updated) {
        throw new NotFoundException(
          `Grade curricular com código ${codigo} não encontrada`,
        );
      }

      return toLowerCaseKeys([updated])[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Erro ao alterar status da grade curricular:', error);
      throw new InternalServerErrorException(
        `Erro ao alterar status da grade curricular: ${error.message}`,
      );
    }
  }

  async listarUnidadeCurricularDept(dto: FindUnidadeCurricularDeptDto) {
    const {
      departamento,

      search,
      page = 1,
      limit = 25,
    } = dto;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['1=1'];
    const params: Record<string, any> = {};
    const type = 'DEPARTAMENTO';

    if (!departamento) {
      throw new BadRequestException('Departamento é obrigatório');
    }

    if (type) {
      conditions.push('gc.TYPE = :type');
      params.type = type;
    }
    if (departamento) {
      conditions.push('gc.CODIGO_CURSO = :departamento');
      params.departamento = departamento;
    }

    if (search) {
      conditions.push('UPPER(dic.DESIGNACAO) LIKE UPPER(:search)');
      params.search = `%${search}%`;
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const sql = `
    SELECT
      gc.CODIGO                     AS codigo_grade,
      gc.CODIGO_DISCIPLINA          AS codigo_disciplina,
      dic.DESIGNACAO                AS unidade_curricular,

      gc.CODIGO_CURSO              AS codigo_departamento,
      gc.STATUS_                    AS status
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dic ON dic.CODIGO = gc.CODIGO_DISCIPLINA

    ${whereClause}
    ORDER BY dic.DESIGNACAO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dic ON dic.CODIGO = gc.CODIGO_DISCIPLINA
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
      console.error(
        'Erro ao listar unidades curriculares do departamento:',
        error,
      );
      throw new InternalServerErrorException(
        `Erro ao listar unidades curriculares: ${error.message}`,
      );
    }
  }

  async adicionarUnidadeCurricularNoPlano(
    dto: CreateUnidadeCurricularDto,
    codigoUtilizador: number,
  ) {
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
      { codigoDisciplina } as any,
    );

    if (Number(disciplinaResult?.[0]?.TOTAL) === 0) {
      throw new NotFoundException('Não foi encontrado disciplina.');
    }

    // 2. Verificar se existe plano do curso
    let codigoPlanoCurso: number;

    codigoPlanoCurso = await this.getPlanoCurso(codigoCurso, codigoAnoLectivo);

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
      { codigoDisciplina, codigoCurso, codigoSemestre } as any,
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
        { codigoDisciplina, codigoSemestre, codigoCurso } as any,
      );

      if (Number(existDeptResult?.[0]?.TOTAL) > 0) {
        throw new BadRequestException(
          'Esta grade já está vinculada a um departamento.',
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
        { codigoPlanoCurso, codigoGrade, codigoClasse } as any,
      );

      if (Number(existPlanoResult?.[0]?.TOTAL) > 0) {
        // Grade já está no plano — reativar
        await this.ativegrade(codigoGrade);

        return {
          message: 'Grade curricular reativada com sucesso.',
          codigo: codigoGrade,
        };
      }

      // 6a. Não está no plano — adicionar ao plano
      await this.ativegrade(codigoGrade);
      await this.adicionarPlano(
        codigoUtilizador,
        codigoGrade,
        codigoPlanoCurso,
      );
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
        throw new InternalServerErrorException(
          'Erro ao criar grade curricular.',
        );
      }

      // 5b. Adicionar ao plano
      await this.adicionarPlano(
        codigoUtilizador,
        codigoGrade,
        codigoPlanoCurso,
      );
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
      { codigoGrade } as any,
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
    const { disciplinas, codigoDepartamento, codigoClasse } = dto;

    const resultados: {
      codigoDisciplina: number;
      status: string;
      mensagem: string;
    }[] = [];
    const classeResult = await this.dataSource.query(
      `
    SELECT CODIGO
    FROM FK2_TB_CLASSES
    WHERE SIGLA = 'TRONCO_COMUM'
    `,
    );
    const classe = classeResult?.[0]?.CODIGO ?? codigoClasse;

    for (const { codigoDisciplina } of disciplinas) {
      const resultado = {
        codigoDisciplina,
        status: 'sucesso',
        mensagem: '',
      };
      try {
        // Verifica se a disciplina existe
        const disciplinaResult = await this.dataSource.query(
          `
        SELECT COUNT(*) TOTAL
        FROM FK2_TB_DISCIPLINAS
        WHERE CODIGO = :codigoDisciplina
        `,
          { codigoDisciplina } as any,
        );
        if (Number(disciplinaResult?.[0]?.TOTAL) === 0) {
          throw new NotFoundException(
            `Disciplina ${codigoDisciplina} não encontrada.`,
          );
        }
        const existResult = await this.dataSource.query(
          `
  SELECT CODIGO
  FROM FK2_TB_GRADE_CURRICULAR
  WHERE CODIGO_CURSO = :codigoDepartamento
    AND CODIGO_DISCIPLINA = :codigoDisciplina
    AND CODIGO_CLASSE = :codigoClasse
  FETCH FIRST 1 ROWS ONLY
  `,
          {
            codigoDepartamento,
            codigoDisciplina,
            codigoClasse,
          } as any,
        );

        const registro = existResult?.[0];
        const existe = !!registro;
        const codigoGradeCurricular = registro?.CODIGO;

        if (existe) {
          // Reactiva o registo
          await this.dataSource.query(
            `
          UPDATE FK2_TB_GRADE_CURRICULAR
             SET STATUS_ = 1,
             TYPE = 'DEPARTAMENTO'
           WHERE CODIGO = :codigo
          `,
            {
              codigo: codigoGradeCurricular,
            } as any,
          );

          resultado.mensagem = 'Disciplina reactivada no departamento.';
        } else {
          // Insere apenas no departamento
          await this.dataSource.query(
            `
          INSERT INTO FK2_TB_GRADE_CURRICULAR
          (
              CODIGO_CURSO,
              FK_DEPARTAMENTO,
              CODIGO_DISCIPLINA,
              TYPE,
              DATA_REGISTO,
              STATUS_,
              CODIGO_CLASSE

          )
          VALUES
          (
               :codigoCurso,
              :codigoDepartamento,
              :codigoDisciplina,
              'DEPARTAMENTO',
              SYSDATE,
              1,
              :codigoClasse
          )
          `,
            {
              codigoCurso: codigoDepartamento,
              codigoDepartamento,
              codigoDisciplina,
              codigoClasse: classe,
            } as any,
          );

          resultado.mensagem = 'Disciplina adicionada ao departamento.';
        }
      } catch (error) {
        resultado.status = 'erro';
        resultado.mensagem = error.message;
      }

      resultados.push(resultado);
    }

    return {
      message: 'Processamento concluído.',
      total: resultados.length,
      sucesso: resultados.filter((x) => x.status === 'sucesso').length,
      erros: resultados.filter((x) => x.status === 'erro').length,
      detalhes: resultados,
    };
  }
  async adicionarUcDoDepartamentoParaPlanoCurso(
    dto: CreateUCTroncoComumPlanoCursoDto,
    codigoUtilizador: number,
  ) {
    const { anoLetivo, codigoGrade, cursos: cursosOriginais } = dto;

    // Remove duplicados exatos (mesmo curso + classe + semestre) do payload,
    // mantendo a primeira ocorrência
    const chavesVistas = new Set<string>();
    const cursos = cursosOriginais.filter((c) => {
      const chave = `${c.codigoCurso}-${c.codigoClasse}-${c.codigoSemestre}`;
      if (chavesVistas.has(chave)) return false;
      chavesVistas.add(chave);
      return true;
    });

    const gradeCurricular = await this.dataSource.query(
      `
    SELECT g.CODIGO, d.DESIGNACAO AS NOME_DISCIPLINA,g.CODIGO_CURSO
    FROM FK2_TB_GRADE_CURRICULAR g
    JOIN FK2_TB_DISCIPLINAS d ON d.CODIGO = g.CODIGO_DISCIPLINA
    WHERE g.CODIGO = :codigoGrade
    AND g.TYPE = 'DEPARTAMENTO'
    `,
      { codigoGrade } as any,
    );
    if (gradeCurricular.length === 0) {
      throw new NotFoundException(`Grade ${codigoGrade} não encontrada.`);
    }

    //Criar Plano do departamento se não existir
    const codigoCurso = gradeCurricular[0].CODIGO_CURSO;
    const codigoPlanoCurso = await this.getPlanoCurso(codigoCurso, anoLetivo);
    // Criar plano da grade se não existir
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
        
      `,
      { codigoPlanoCurso, codigoGrade } as any,
    );
    if (Number(existPlanoResult?.[0]?.TOTAL) > 0) {
      // Grade já está no plano — reativar
      await this.ativegrade(codigoGrade);

      return {
        message: 'Grade curricular reativada com sucesso.',
        codigo: codigoGrade,
      };
    }

    // 6a. Não está no plano — adicionar ao plano
    await this.ativegrade(codigoGrade);
    await this.adicionarPlano(codigoUtilizador, codigoGrade, codigoPlanoCurso);

    const nomeDisciplina = gradeCurricular[0].NOME_DISCIPLINA;

    // Busca os nomes de todos os cursos em lote (evita N+1 queries)
    const codigosCursos = cursos.map((c) => c.codigoCurso);
    const nomesCursos = await this.buscarNomesCursos(codigosCursos);
    const cursosComSucesso: {
      codigoCurso: number;
      nomeCurso: string | null;
      codigoGrade: number;
      nomeDisciplina: string | null;
      codigoPlanoCurso: number;
    }[] = [];
    const cursosComErro: {
      codigoCurso: number;
      nomeCurso: string | null;
      codigoGrade: number;
      nomeDisciplina: string | null;
      motivo: string;
    }[] = [];

    for (const cursoItem of cursos) {
      const codigoCurso = cursoItem.codigoCurso;
      const codigoClasse = cursoItem.codigoClasse;
      const codigoSemestre = cursoItem.codigoSemestre;
      const nomeCurso = nomesCursos.get(codigoCurso) ?? null;

      try {
        // 1. Verifica se o curso já tem plano curricular neste ano letivo
        const planoCursoExistente = await this.dataSource.query(
          `
        SELECT * FROM FK2_TB_PLANO_CURRICULAR_CURSO
        WHERE CODIGO_CURSO = :codigoCurso AND CODIGO_ANO_LECTIVO = :anoLetivo
        `,
          { codigoCurso, anoLetivo } as any,
        );

        let codigoPlanoCurso: number;

        if (!planoCursoExistente.length) {
          const novoPlanoCurso = await this.criarPlanoCurso(
            codigoCurso,
            anoLetivo,
            codigoUtilizador,
          );
          codigoPlanoCurso = novoPlanoCurso?.[0]?.CODIGO ?? novoPlanoCurso;
        } else {
          codigoPlanoCurso = planoCursoExistente[0].CODIGO;
        }

        if (!codigoPlanoCurso) {
          throw new Error('Não foi possível obter o código do plano de curso.');
        }

        // 2. Verifica se a grade curricular já está associada a este plano de curso
        const gradeJaAssociadaAoPlano = await this.dataSource.query(
          `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_TB_PLANO_CURRICULAR_GRADE plano
        JOIN FK2_TB_GRADE_CURRICULAR grade ON grade.CODIGO = plano.CODIGO_GRADE_CURRICULAR
        WHERE plano.CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
          AND grade.CODIGO = :codigoGrade
        `,
          { codigoPlanoCurso, codigoGrade } as any,
        );

        if (Number(gradeJaAssociadaAoPlano?.[0]?.TOTAL) > 0) {
          await this.ativegrade(codigoGrade);
        } else {
          await this.adicionarPlano(
            codigoUtilizador,
            codigoGrade,
            codigoPlanoCurso,
          );
        }

        // 3. Verifica se a combinação já existe na tabela de controlo antes de inserir
        const combinacaoJaExiste = await this.dataSource.query(
          `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE
        WHERE CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
          AND CODIGO_CLASSE = :codigoClasse
          AND CODIGO_GRADE_CURRICULAR = :codigoGrade
          AND CODIGO_SEMESTRE = :codigoSemestre
        `,
          {
            codigoPlanoCurso,
            codigoClasse,
            codigoGrade,
            codigoSemestre,
          } as any,
        );

        if (Number(combinacaoJaExiste?.[0]?.TOTAL) > 0) {
          // Não interrompe o loop: regista como erro e segue para o próximo curso
          cursosComErro.push({
            codigoCurso,
            nomeCurso,
            codigoGrade,
            nomeDisciplina,
            motivo:
              'A disciplina já está associada a este plano de curso para a classe/semestre indicados.',
          });
          continue;
        }

        // Regista a associação grade/semestre/classe na tabela de controlo
        await this.dataSource.query(
          `
        INSERT INTO FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE
          (CODIGO_PLANO_CURRICULAR_CURSO, CODIGO_CLASSE, CODIGO_GRADE_CURRICULAR, CODIGO_SEMESTRE)
        VALUES
          (:codigoPlanoCurso, :codigoClasse, :codigoGrade, :codigoSemestre)
        `,
          {
            codigoPlanoCurso,
            codigoClasse,
            codigoGrade,
            codigoSemestre,
          } as any,
        );

        cursosComSucesso.push({
          codigoCurso,
          nomeCurso,
          codigoGrade,
          nomeDisciplina,
          codigoPlanoCurso,
        });
      } catch (error) {
        // ORA-00001: violação de constraint única (UK_PCGS)
        // Cobre o caso de concorrência: dois pedidos a tentar inserir a mesma
        // combinação CODIGO_PLANO_CURRICULAR_CURSO + CODIGO_CLASSE +
        // CODIGO_GRADE_CURRICULAR + CODIGO_SEMESTRE ao mesmo tempo.
        const mensagemErro = error?.message ?? '';
        const codigoOracle = error?.code ?? error?.errorNum ?? null;
        const isDuplicidade =
          codigoOracle === 1 ||
          mensagemErro.includes('ORA-00001') ||
          mensagemErro.includes('UK_PCGS');

        cursosComErro.push({
          codigoCurso,
          nomeCurso,
          codigoGrade,
          nomeDisciplina,
          motivo: isDuplicidade
            ? 'A disciplina já está associada a este plano de curso para a classe/semestre indicados.'
            : mensagemErro || 'Erro desconhecido ao processar o curso.',
        });
      }
    }

    return {
      message:
        cursosComErro.length === 0
          ? `Disciplina "${nomeDisciplina}" adicionada ao plano de curso com sucesso para todos os cursos.`
          : 'Processamento concluído com falhas parciais.',
      codigoGrade,
      nomeDisciplina,
      totalCursos: cursos.length,
      totalSucesso: cursosComSucesso.length,
      totalErros: cursosComErro.length,
      sucesso: cursosComSucesso,
      erros: cursosComErro,
    };
  }
  async consultarCursosVinculadosGrade(dto: ConsultarVinculacaoGradeDto) {
    const { codigoGrade, anoLetivo, codigoCurso } = dto;

    const gradeExiste = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_GRADE_CURRICULAR WHERE CODIGO = :codigoGrade`,
      { codigoGrade } as any,
    );
    if (gradeExiste.length === 0) {
      throw new NotFoundException(`Grade ${codigoGrade} não encontrada.`);
    }

    const filtroCurso = codigoCurso ? 'AND pcc.CODIGO_CURSO = :codigoCurso' : '';

    const resultado = await this.dataSource.query(
      `
    SELECT
      pcc.CODIGO_CURSO             AS CODIGO_CURSO,
      cur.DESIGNACAO                AS NOME_CURSO,
      pcgs.CODIGO_CLASSE            AS CODIGO_CLASSE,
      cl.DESIGNACAO                 AS NOME_CLASSE,
      pcgs.CODIGO_SEMESTRE          AS CODIGO_SEMESTRE,
      pcgs.CODIGO_GRADE_CURRICULAR  AS CODIGO_GRADE,
      pcc.CODIGO                    AS CODIGO_PLANO_CURRICULAR_CURSO
    FROM FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE pcgs
    JOIN FK2_TB_PLANO_CURRICULAR_CURSO pcc
      ON pcc.CODIGO = pcgs.CODIGO_PLANO_CURRICULAR_CURSO
    JOIN FK2_TB_CURSOS cur
      ON cur.CODIGO = pcc.CODIGO_CURSO
    JOIN FK2_TB_CLASSES cl
      ON cl.CODIGO = pcgs.CODIGO_CLASSE
    WHERE pcgs.CODIGO_GRADE_CURRICULAR = :codigoGrade
      AND pcc.CODIGO_ANO_LECTIVO = :anoLetivo
      ${filtroCurso}
    ORDER BY cur.DESIGNACAO, cl.DESIGNACAO, pcgs.CODIGO_SEMESTRE
    `,
      { codigoGrade, anoLetivo, ...(codigoCurso ? { codigoCurso } : {}) } as any,
    );

    return {
      codigoGrade,
      anoLetivo,
      total: resultado.length,
      vinculos: resultado.map((r) => ({
        codigoCurso: r.CODIGO_CURSO,
        nomeCurso: r.NOME_CURSO,
        codigoClasse: r.CODIGO_CLASSE,
        anoCurricular: r.NOME_CLASSE,
        codigoSemestre: r.CODIGO_SEMESTRE,
      })),
    };
  }

  private async buscarNomesCursos(
    codigos: number[],
  ): Promise<Map<number, string>> {
    if (!codigos.length) return new Map();

    const placeholders = codigos.map((_, idx) => `:codigo${idx}`).join(', ');
    const params: Record<string, any> = {};
    codigos.forEach((codigo, idx) => {
      params[`codigo${idx}`] = codigo;
    });

    // ⚠️ Confirme o nome real da tabela/coluna de cursos
    const rows = await this.dataSource.query(
      `
    SELECT CODIGO, DESIGNACAO as NOME
    FROM FK2_TB_CURSOS
    WHERE CODIGO IN (${placeholders})
    `,
      params as any,
    );

    return new Map(
      (rows ?? []).map((r: any) => [Number(r.CODIGO), String(r.NOME)]),
    );
  }

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private async criarPlanoCurso(
    codigoCurso: number,
    codigoAnoLectivo: number,
    codigoUtilizador: number,
  ): Promise<number> {
    const resultDescription = await this.dataSource.query(
      `
        SELECT
          (SELECT DESIGNACAO FROM FK2_TB_CURSOS WHERE CODIGO = :CODIGOCURSO) AS CURSO,
           (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :CODIGOANOLECTIVO) AS ANOLECTIVO
        FROM dual
        `,
      { codigoCurso, codigoAnoLectivo } as any,
    );
    const description = `Plano de Estudo do Curso de ${resultDescription?.[0]?.CURSO} ${resultDescription?.[0]?.ANOLECTIVO}`;

    const result = await this.dataSource.query(
      `
      INSERT INTO FK2_TB_PLANO_CURRICULAR_CURSO
        (CODIGO_CURSO,DESIGNACAO, CODIGO_ANO_LECTIVO, CODIGO_UTILIZADOR, DATA )
      VALUES
        (:codigoCurso,:descricao ,:codigoAnoLectivo, :codigoUtilizador, SYSDATE)
      RETURNING CODIGO INTO :codigo
      `,
      {
        codigoCurso,
        descricao: description,
        codigoAnoLectivo,
        codigoUtilizador,

        codigo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      } as any,
    );

    return Number(result?.[0]?.codigo ?? result?.codigo);
  }

  private async ativegrade(codigoGrade: number) {
    await this.dataSource.query(
      `
      UPDATE FK2_TB_GRADE_CURRICULAR
      SET STATUS_ = 1
      WHERE CODIGO = :codigoGrade
      `,
      { codigoGrade } as any,
    );
  }
  private async inativegrade(codigoGrade: number) {
    await this.dataSource.query(
      `
      UPDATE FK2_TB_GRADE_CURRICULAR
      SET STATUS_ = 0
      WHERE CODIGO = :codigoGrade
      `,
      { codigoGrade } as any,
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
      } as any,
    );

    return result?.outId[0];
  }

  private async adicionarPlano(
    codigoUtilizador: number,
    codigoGrade: number,
    codigoPlanoCurso: number,
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
        { codigoPlanoCurso, codigoGrade, codigoUtilizador } as any,
      );
    } catch (error) {
      console.error('Erro ao adicionar plano de grade:', error);
      throw new InternalServerErrorException(
        `Erro ao adicionar grade no plano: ${error.message}`,
      );
    }
  }
  private async getPlanoCurso(
    codigoCurso: number,
    codigoAnoLectivo: number,
  ): Promise<number> {
    const planos = await this.dataSource.query(
      `
      SELECT CODIGO
      FROM FK2_TB_PLANO_CURRICULAR_CURSO
      WHERE CODIGO_CURSO = :codigoCurso
        AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      FETCH FIRST 1 ROWS ONLY
    `,
      { codigoCurso, codigoAnoLectivo } as any,
    );

    const planoExistente = planos?.[0];

    if (planoExistente) {
      return Number(planoExistente.CODIGO);
    }
    const codigoPlanoCurso = await this.criarPlanoCurso(
      codigoCurso,
      codigoAnoLectivo,
      1,
    );
    if (codigoPlanoCurso) {
      return codigoPlanoCurso;
    }
    throw new NotFoundException(
      `Plano do curso não encontrado para o curso ${codigoCurso} e ano lectivo ${codigoAnoLectivo}.`,
    );
  }
}
