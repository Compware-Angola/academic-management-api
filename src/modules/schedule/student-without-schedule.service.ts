import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindStudentsWithoutScheduleDto } from './dto/find-students-without-schedule.dto';

@Injectable()
export class StudentWithoutScheduleService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}
  async findAll(dto: FindStudentsWithoutScheduleDto) {
    const {
      anoLectivo,
      semestre,
      classe,
      curso,
      searchTerm,
      page = 1,
      limit = 25,
    } = dto;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: Record<string, any> = {};

    conditions.push(`al.REF_HORARIO IS NULL`);
    conditions.push(`al.CODIGO_ANO_LECTIVO = :anoLectivo`);

    params.anoLectivo = anoLectivo;

    if (semestre) {
      conditions.push(`s.CODIGO = :semestre`);
      params.semestre = semestre;
    }

    if (classe) {
      conditions.push(`c.CODIGO = :classe`);
      params.classe = classe;
    }

    if (curso) {
      conditions.push(`cu.CODIGO = :curso`);
      conditions.push(`m.CODIGO_CURSO = :curso`);
      params.curso = curso;
    }

    if (searchTerm?.trim()) {
      conditions.push(`
      (
        TO_CHAR(m.CODIGO) LIKE :search
        OR FN_REMOVE_ACENTOS(UPPER(d.DESIGNACAO))
           LIKE FN_REMOVE_ACENTOS(UPPER(:search))
      )
    `);

      params.search = `%${searchTerm.trim()}%`;
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    INNER JOIN FK2_TB_GRADE_CURRICULAR g
      ON g.CODIGO = al.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_SEMESTRES s
      ON s.CODIGO = g.CODIGO_SEMESTRE
    INNER JOIN FK2_TB_CLASSES c
      ON c.CODIGO = g.CODIGO_CLASSE
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d.CODIGO = g.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CURSOS cu
      ON cu.CODIGO = g.CODIGO_CURSO
    INNER JOIN FK2_TB_MATRICULAS m
      ON m.CODIGO = al.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.CODIGO = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.CODIGO = a.PRE_INCRICAO
    WHERE ${whereClause}
  `;

    const dataSql = `
    SELECT *
    FROM (
      SELECT
        m.CODIGO            AS CODIGO_MATRICULA,
        p.NOME_COMPLETO     AS NOME,
        al.CODIGO           AS CODIGO_GRADE_ALUNO,
        g.CODIGO            AS CODIGO_GRADE,
        d.DESIGNACAO        AS DISCIPLINA,
        d.CODIGO            AS CODIGO_DISCIPLINA,
        s.CODIGO            AS CODIGO_SEMESTRE,
        s.DESIGNACAO        AS SEMESTRE,
        cu.CODIGO           AS CODIGO_CURSO,
        cu.DESIGNACAO       AS CURSO,
        c.CODIGO            AS CODIGO_CLASSE,
        c.DESIGNACAO        AS CLASSE,
        ROW_NUMBER() OVER (
          ORDER BY p.NOME_COMPLETO ASC
        ) AS RN
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
      INNER JOIN FK2_TB_GRADE_CURRICULAR g
        ON g.CODIGO = al.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_SEMESTRES s
        ON s.CODIGO = g.CODIGO_SEMESTRE
      INNER JOIN FK2_TB_CLASSES c
        ON c.CODIGO = g.CODIGO_CLASSE
      INNER JOIN FK2_TB_DISCIPLINAS d
        ON d.CODIGO = g.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS cu
        ON cu.CODIGO = g.CODIGO_CURSO
      INNER JOIN FK2_TB_MATRICULAS m
        ON m.CODIGO = al.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO a
        ON a.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.CODIGO = a.PRE_INCRICAO
      WHERE ${whereClause}
    ) T
    WHERE T.RN BETWEEN :offset + 1 AND :offset + :limit
    ORDER BY T.RN
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(dataSql, {
        ...params,
        offset,
        limit,
      } as any),
      this.dataSource.query(countSql, params as any),
    ]);

    const total = Number(countResult[0]?.TOTAL ?? 0);

    const data = result.map((row: any) => {
      const { RN, rn, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
