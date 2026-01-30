import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { getAttendanceListDto } from './dto/get-attendanceList.dto';

@Injectable()
export class AttendanceListService {
  constructor(private readonly dataSource: DataSource) {}

  async getAttendanceList(dto: getAttendanceListDto) {
    const prestacao = await this.getPrestacao(dto.anoLectivo);
    const { anoLectivo, horarioPk } = dto;

    if (!anoLectivo || prestacao == null || !horarioPk) {
      throw new BadRequestException(
        'anoLectivo, prestacao e horarioPk são obrigatórios',
      );
    }
    const sql = `
     SELECT
    m.codigo AS numero_matricula,
    pre.nome_completo AS nome,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM FK2_TB_BOLSEIROS b
            WHERE b.CODIGO_MATRICULA = m.codigo
        )
        THEN 1
        ELSE 0
    END AS is_bolseiro,
    (
        SELECT JSON_ARRAYAGG(
                   JSON_OBJECT(
                       'mes_temp_id' VALUE fi.mes_temp_id,
                       'factura'     VALUE f.codigo
                   )
               )
        FROM fk2_factura f
        JOIN fk2_factura_items fi ON fi.codigofactura = f.codigo
        JOIN fk2_mes_temp mt ON mt.id = fi.mes_temp_id
        WHERE mt.ano_lectivo = :anoLectivo
          AND mt.prestacao <=  :prestacao
          AND f.estado = 1
          AND f.codigomatricula = m.codigo
    ) AS mes_pago
    FROM fk2_tb_grade_curricular_aluno al
    INNER JOIN fk2_tb_matriculas m ON m.codigo = al.codigo_matricula
    INNER JOIN fk2_tb_admissao ad ON ad.codigo = m.codigo_aluno
    INNER JOIN fk2_tb_preinscricao pre ON pre.codigo = ad.pre_incricao
    WHERE 1=1
    and  JSON_VALUE(al.REF_HORARIO, '$.pk') = :horarioPk
    and   al.CODIGO_ANO_LECTIVO = :anoLectivo
    `;
    const results = await this.dataSource.query(sql, {
      anoLectivo,
      prestacao,
      horarioPk,
    } as any);

    const parsedResults = results.map((row: any) => ({
      ...row,
      mes_pago: row.MES_PAGO ? JSON.parse(row.MES_PAGO) : [],
    }));

    return await {
      data: toLowerCaseKeys(parsedResults),
      prestacao,
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
