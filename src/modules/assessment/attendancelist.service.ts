import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { getAttendanceListDto } from './dto/get-attendanceList.dto';

@Injectable()
export class AttendanceListService {
  constructor(private readonly dataSource: DataSource) {}
  async getAttendanceList(dto: getAttendanceListDto) {
    const prestacao = await this.getPrestacao(dto.anoLectivo);

    const {
      anoLectivo,
      horarioPk,
      semestre,
      page = 1,
      limit = 25,
      situacao_financeira,
      codigoMatricula,
      nome,
    } = dto;

    if (
      !anoLectivo ||
      prestacao == null ||
      !horarioPk ||
      !situacao_financeira ||
      !semestre
    ) {
      throw new BadRequestException(
        'anoLectivo, prestacao, situação e horarioPk são obrigatórios',
      );
    }

    const offset = (page - 1) * limit;
    const realLimit = limit + 1;

    const sql = `
   SELECT *
    FROM (
      SELECT
        m.codigo AS numero_matricula,
        pre.nome_completo as nome,
        cc.designacao     as curso,
        pp.designacao     as periodo,
        cl.designacao     as classe,
        al.CODIGO_STATUS_GRADE_CURRICULAR,
        CASE
          WHEN b.codigo_matricula IS NOT NULL THEN 1
          ELSE 0
        END AS is_bolseiro,
        COALESCE(p.mes_pago, 0) AS mes_pago
      FROM fk2_tb_grade_curricular_aluno al
      INNER JOIN fk2_tb_matriculas m
        ON m.codigo = al.codigo_matricula
      INNER JOIN fk2_tb_admissao ad
        ON ad.codigo = m.codigo_aluno
      INNER JOIN fk2_tb_preinscricao pre
        ON pre.codigo = ad.pre_incricao
      INNER JOIN fk2_tb_cursos cc on cc.codigo = m.codigo_curso
      INNER JOIN FK2_TB_GRADE_CURRICULAR gg on gg.codigo = al.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_CLASSES          cl on cl.codigo = gg.CODIGO_CLASSE
      LEFT  JOIN FK2_MGH_TB_HORARIO hr on hr.PK_HORARIO = JSON_VALUE(al.REF_HORARIO, '$.pk')
      LEFT  JOIN FK2_TB_PERIODOS pp on pp.codigo = hr.FK_PERIODO
      -- bolseiros sem duplicar
      LEFT JOIN (
        SELECT
          codigo_matricula,
          1 AS is_bolseiro
        FROM FK2_TB_BOLSEIROS
        WHERE codigo_anolectivo = ${anoLectivo}
          AND (desconto = 0 OR desconto = 100)
          AND SEMESTRE = ${semestre}
          AND STATUS_  = 1
        GROUP BY codigo_matricula
      ) b ON b.codigo_matricula = m.codigo
      -- meses pagos
      LEFT JOIN (
        SELECT
          f.codigomatricula,
          COUNT(mt.id) AS mes_pago
        FROM fk2_factura f
        JOIN fk2_factura_items fi
          ON fi.codigofactura = f.codigo
        JOIN fk2_mes_temp mt
          ON mt.id = fi.mes_temp_id
        WHERE mt.ano_lectivo = ${anoLectivo}
          AND mt.prestacao <= ${prestacao}
          AND f.estado = 1
        GROUP BY f.codigomatricula
      ) p ON p.codigomatricula = m.codigo
      WHERE
        JSON_VALUE(al.REF_HORARIO, '$.pk') = ${horarioPk}
        AND al.CODIGO_ANO_LECTIVO = ${anoLectivo}
        AND al.CODIGO_STATUS_GRADE_CURRICULAR <> 4
        AND (:nome IS NULL OR fn_remove_acentos(UPPER(pre.nome_completo)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
        AND (:codigoMatricula IS NULL or m.codigo = :codigoMatricula)
    )
    WHERE
      ${
        situacao_financeira == 2
          ? `is_bolseiro = 0 AND mes_pago < ${prestacao}`
          : `(is_bolseiro = 1 OR mes_pago >= ${prestacao})`
      }

    ORDER BY nome ASC
    OFFSET ${offset} ROWS FETCH NEXT ${realLimit} ROWS ONLY
  `;

    const rows = await this.dataSource.query(sql, {
      nome: nome ?? null,
      codigoMatricula: codigoMatricula ?? null,
    } as any);

    const hasNextPage = rows.length > limit;

    if (hasNextPage) {
      rows.pop();
    }
    return {
      data: await toLowerCaseKeys(rows),
      page,
      limit,
      hasNextPage,
    };
  }

  private async getPrestacao(ano_lectivo: number) {
    const sql = `
   SELECT
      pg.DESCRICAO,
      pg.OBSERVACAO,
      mt.PRESTACAO

    FROM
      FK2_TB_PARAMETROS_GERAIS_MUTUE pg
      LEFT JOIN FK2_MES_TEMP mt
        ON pg.OBSERVACAO = mt.ID
    WHERE
      pg.ACTIVO = 1
      AND pg.CODIGO = 16

    `;
    const result = await this.dataSource.query(sql);
    return result[0].PRESTACAO;
  }
}
