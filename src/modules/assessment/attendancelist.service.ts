import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { getAttendanceListDto } from "./dto/get-attendanceList.dto";

@Injectable()
export class AttendanceListService {
    constructor(private readonly dataSource: DataSource) { }

async getAttendanceList(dto: getAttendanceListDto) {
  const prestacao = await this.getPrestacao(dto.anoLectivo);
  const { anoLectivo, horarioPk, situacao_financeira } = dto;

  if (!anoLectivo || prestacao == null || !horarioPk) {
    throw new BadRequestException('anoLectivo, prestacao e horarioPk são obrigatórios');
  }

  // Define o operador de comparação financeira
  let comparacaoFinanceira: string;
  if (situacao_financeira === 1) {
    comparacaoFinanceira = '='; 
  } else if (situacao_financeira === 2) {
    comparacaoFinanceira = '<'; 
  } else {
    comparacaoFinanceira = '=';  
  }

  const sql = `
    WITH meses_obrigatorios AS (
      SELECT COUNT(*) AS qtd_meses
      FROM fk2_mes_temp
      WHERE ano_lectivo = :anoLectivo
        AND prestacao <= :prestacao
    ),
    meses_pagos AS (
      SELECT
        f.codigomatricula,
        COUNT(DISTINCT fi.mes_temp_id) AS qtd_pagos
      FROM fk2_factura f
      JOIN fk2_factura_items fi ON fi.codigofactura = f.codigo
      JOIN fk2_mes_temp mt ON mt.id = fi.mes_temp_id
      WHERE mt.ano_lectivo = :anoLectivo
        AND mt.prestacao <= :prestacao
        AND f.estado = 1
      GROUP BY f.codigomatricula
    )
    SELECT
      m.codigo AS numero_matricula,
      pre.nome_completo AS nome,
      NVL(MAX(CASE WHEN av.tipo_avaliacao = 2 THEN av.nota END), 0) AS primeira_frequencia,
      NVL(MAX(CASE WHEN av.tipo_avaliacao = 3 THEN av.nota END), 0) AS segunda_frequencia,
      NVL(MAX(CASE WHEN av.tipo_avaliacao = 6 THEN av.nota END), 0) AS exame,
      mo.qtd_meses AS meses_obrigatorios,
      NVL(mp.qtd_pagos, 0) AS meses_pagos,
      CASE WHEN bl.CODIGO IS NOT NULL THEN 1 ELSE 0 END AS eh_bolseiro
    FROM fk2_tb_grade_curricular_aluno al
    JOIN fk2_tb_matriculas m ON m.codigo = al.codigo_matricula
    JOIN fk2_tb_admissao ad ON ad.codigo = m.codigo_aluno
    JOIN fk2_tb_preinscricao pre ON pre.codigo = ad.pre_incricao
    LEFT JOIN fk2_tb_grade_curricular_aluno_avaliacoes av 
           ON av.grade_curricular_aluno = al.codigo
    LEFT JOIN FK2_TB_BOLSEIROS bl ON bl.CODIGO_MATRICULA = m.codigo
    CROSS JOIN meses_obrigatorios mo
    LEFT JOIN meses_pagos mp ON mp.codigomatricula = m.codigo
    WHERE JSON_VALUE(al.REF_HORARIO, '$.pk') = :horarioPk
      AND (av.tipo_avaliacao IN (2, 3, 6) OR av.tipo_avaliacao IS NULL)
      AND (
            NVL(mp.qtd_pagos, 0) ${comparacaoFinanceira} mo.qtd_meses
            
          )
    GROUP BY 
      m.codigo,
      pre.nome_completo,
      mo.qtd_meses,
      mp.qtd_pagos,
      bl.CODIGO
    ORDER BY pre.nome_completo
  `;

  const results = await this.dataSource.query(sql, {
    anoLectivo,
    prestacao,
    horarioPk,
  } as any);

  return await toLowerCaseKeys(results);
}
private  async getPrestacao(ano_lectivo: number) {
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