import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiltroLancamentoPautaDto } from './dto/filtro-lancamento-pauta.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateLancamentoPautaDto } from './dto/create-lancamento-pauta.dto';
import { escapeQuotes } from '../util/escape-quotes';
import { UpdateEstadoPautaDto } from './dto/update-estado-pauta.dto';

@Injectable()
export class AgendaLaunchService {
  constructor(private readonly dataSource: DataSource) {}

  async getAll(filtros: FiltroLancamentoPautaDto) {
    const {
      anoLectivo,
      tipoAvaliacao,
      codigoGrade,
      curso,
      semestre,
      anoCurricular,
      page = 1,
      limit = 20,
      estadoPauta,
    } = filtros;

    if (!anoLectivo) {
      throw new BadRequestException('O campo anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;

    const params: any = {
      anoLectivo,
      offset,
      limitFinal: offset + limit,
    };

    let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados.created_at DESC, dados.codigo DESC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT
          pt.PK_LANCAMENTO_PAUTA                              AS codigo,
          pt.CREATED_AT                                       AS created_at,
          pt.UPDATED_AT                                       AS updated_at,
          pt.FK_ESTADO_LANCAMENTO_PAUTA                       AS estado_pauta,
          estn.DESIGNACAO                                   AS estado_pauta_designacao,
          pt.ACTIVE_STATE                                     AS active_state,
          pt.FICHEIRO_NAME                                    AS ficheiro_name,
          pt.FK_TIPO_AVALIACAO                                AS fk_tipo_avaliacao,
          pt.FK_USER_VALIDACAO                                AS fk_user_validacao,
          al.DESIGNACAO                                       AS ano_lectivo,
          av.DESIGNACAO                                       AS designacao_av,
          ftc.DESIGNACAO                                      AS classe,
          fts.DESIGNACAO                                      AS semestre,
          ftc2.DESIGNACAO                                     AS curso,
          JSON_VALUE(pt.REF_DOCENTE, '$.desc')                AS docente_nome,
          JSON_VALUE(pt.REF_DOCENTE, '$.pk')                  AS codigo_docente,
          tgc.CODIGO                                          AS codigo_grade,
          DBMS_LOB.SUBSTR(td.DESIGNACAO, 4000, 1)              AS unidade_curricular
        FROM FK2_MGD_TB_LANCAMENTO_PAUTA pt
        INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
          ON tgc.CODIGO = JSON_VALUE(pt.REF_GRADE_CURRICULAR, '$.pk')
        LEFT JOIN FK2_TB_CLASSES ftc
          ON ftc.CODIGO = tgc.CODIGO_CLASSE
        LEFT JOIN FK2_TB_SEMESTRES fts
          ON fts.CODIGO = tgc.CODIGO_SEMESTRE
        LEFT JOIN FK2_TB_CURSOS ftc2
          ON ftc2.CODIGO = tgc.CODIGO_CURSO
          LEFT JOIN FK2_MGD_ESTADO_LANCAMENTO_PAUTA estn
          ON estn.PK_ESTADO = pt.FK_ESTADO_LANCAMENTO_PAUTA
        LEFT JOIN FK2_TB_ANO_LECTIVO al
          ON al.CODIGO = JSON_VALUE(pt.REF_ANO_LECTIVO, '$.pk')
        INNER JOIN FK2_TB_DISCIPLINAS td
          ON td.CODIGO = tgc.CODIGO_DISCIPLINA
        INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO av
          ON pt.FK_TIPO_AVALIACAO = av.PK_TIPO_AVALIACAO
        WHERE tgc.STATUS_ = 1
          AND JSON_VALUE(pt.REF_ANO_LECTIVO, '$.pk') = :anoLectivo
          AND pt.ACTIVE_STATE =1

  `;

    // Filtros opcionais
    if (curso != null) {
      sql += ` AND ftc2.CODIGO = :curso`;
      params.curso = curso;
    }
    if (semestre != null) {
      sql += ` AND fts.CODIGO = :semestre`;
      params.semestre = semestre;
    }
    if (anoCurricular != null) {
      sql += ` AND ftc.CODIGO = :anoCurricular`;
      params.anoCurricular = anoCurricular;
    }
    if (tipoAvaliacao != null) {
      sql += ` AND pt.FK_TIPO_AVALIACAO = :tipoAvaliacao`;
      params.tipoAvaliacao = tipoAvaliacao;
    }

    if (codigoGrade != null) {
      sql += ` AND tgc.CODIGO = :codigoGrade`;
      params.codigoGrade = codigoGrade;
    }
    if (estadoPauta != null) {
      sql += ` AND pt.FK_ESTADO_LANCAMENTO_PAUTA = :estadoPauta`;
      params.estadoPauta = estadoPauta;
    }

    sql += `
      ) dados
    )
    WHERE rn > :offset
      AND rn <= :limitFinal
    ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

    const data = result.map((row: any) => {
      const { rn, total_registros, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(createDto: CreateLancamentoPautaDto) {
    const {
      anoLectivoId,
      docenteId,
      gradeCurricularId,
      fkEstadoLancamentoPauta,
      fkTipoAvaliacao,

      ficheiroName,
    } = createDto;

    const v_desc_grade =
      await this.getDescricaoGradeCurricular(gradeCurricularId);

    const v_desc_ano_lectivo = await this.getDescricaoAnoLectivo(anoLectivoId);
    const nomeDoc = await this.getNomeDocente(docenteId);

    const v_json_docente = `{"pk":${docenteId},"desc":"${escapeQuotes(nomeDoc)}","corLetra":"black"}`;
    const v_json_grade = `{"pk":${gradeCurricularId},"desc":"${escapeQuotes(v_desc_grade)}","corLetra":"black"}`;
    const v_json_ano_lectivo = `{"pk":${anoLectivoId},"desc":"${escapeQuotes(v_desc_ano_lectivo)}","corLetra":"black"}`;

    const now = new Date().toISOString();

    const query = `
  INSERT INTO FK2_MGD_TB_LANCAMENTO_PAUTA (
    REF_ANO_LECTIVO,
    REF_DOCENTE,
    REF_GRADE_CURRICULAR,
    FK_ESTADO_LANCAMENTO_PAUTA,
    CREATED_AT,
    UPDATED_AT,
    ACTIVE_STATE,
    FICHEIRO_NAME,
    FK_TIPO_AVALIACAO
  ) VALUES (
    :refAnoLectivo,
    :refDocente,
    :refGradeCurricular,
    :fkEstado,
    TO_TIMESTAMP(:now, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
    TO_TIMESTAMP(:now, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
    1,
    :ficheiroName,
    :fkTipoAvaliacao
  )
`;

    const parameters = {
      refAnoLectivo: v_json_ano_lectivo,
      refDocente: v_json_docente,
      refGradeCurricular: v_json_grade,
      fkEstado: fkEstadoLancamentoPauta,
      now,
      ficheiroName: ficheiroName || null,
      fkTipoAvaliacao,
    };

    try {
      await this.dataSource.query(query, parameters as any);

      return {
        success: true,
        message: 'Lançamento de pauta criado com sucesso.',
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao inserir lançamento de pauta: ${error.message || error}`,
      );
    }
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoPautaDto) {
    const { fkEstadoLancamentoPauta } = updateEstadoDto;

    // Validação extra: só permite mudar de Pendente para Aprovado/Rejeitado
    const pautaExistente = await this.verificarExistenciaPauta(id);

    if (pautaExistente.FK_ESTADO_LANCAMENTO_PAUTA !== 1) {
      throw new BadRequestException(
        'Só é possível aprovar ou rejeitar pautas que estão no estado Pendente.',
      );
    }

    const now = new Date().toISOString();

    const query = `
    UPDATE FK2_MGD_TB_LANCAMENTO_PAUTA
    SET
      FK_ESTADO_LANCAMENTO_PAUTA = :novoEstado,
      UPDATED_AT = TO_TIMESTAMP(:now, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')
    WHERE PK_LANCAMENTO_PAUTA = :id
  `;

    const parameters = {
      novoEstado: fkEstadoLancamentoPauta,
      now,
      id,
    };

    try {
      const result = await this.dataSource.query(query, parameters as any);

      // Verifica se alguma linha foi afetada
      if (result[1] === 0) {
        throw new BadRequestException('Pauta não encontrada.');
      }

      const estadoDesc =
        fkEstadoLancamentoPauta === 2 ? 'aprovada' : 'rejeitada';

      return {
        success: true,
        message: `Pauta ${estadoDesc} com sucesso.`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Erro ao atualizar estado da pauta: ${error.message || error}`,
      );
    }
  }

  // Método auxiliar (se não tiveres, adiciona)
  private async verificarExistenciaPauta(id: number) {
    const query = `
    SELECT FK_ESTADO_LANCAMENTO_PAUTA AS fk_estado_lancamento_pauta
    FROM FK2_MGD_TB_LANCAMENTO_PAUTA
    WHERE PK_LANCAMENTO_PAUTA = :id
  `;

    const result = await this.dataSource.query(query, [id]);

    if (!result || result.length === 0) {
      throw new NotFoundException('Pauta não encontrada.');
    }

    return result[0];
  }
  async getDescricaoGradeCurricular(codigoGrade: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT d.designacao
     FROM fk2_tb_grade_curricular gc
     INNER JOIN fk2_tb_disciplinas d ON gc.CODIGO_DISCIPLINA = d.codigo
     WHERE gc.codigo = :codigoGrade`,
      [codigoGrade],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Descrição da grade curricular não encontrada para o código ${codigoGrade}`,
      );
    }

    return result[0].DESIGNACAO as string;
  }

  // 4.3) Nome do docente
  async getNomeDocente(codigoDocente: number): Promise<string> {
    const result = await this.dataSource.query(
      `
  SELECT
    JSON_VALUE(CODIGO_UTILIZADOR, '$.desc') AS "nome"
  FROM FK2_MGD_TB_DOCENTE
  WHERE CODIGO = :codigoDocente
  `,
      [codigoDocente],
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${codigoDocente}`);
    }

    return result[0].nome as string;
  }

  // 4.4) Descrição do ano lectivo
  async getDescricaoAnoLectivo(codigoAnoLectivo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM FK2_TB_ANO_LECTIVO
     WHERE CODIGO = :codigoAnoLectivo`,
      [codigoAnoLectivo],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Ano lectivo não encontrado para o código ${codigoAnoLectivo}`,
      );
    }

    return result[0].DESIGNACAO as string;
  }

  async getPautaEstado() {
    const sql = `
      SELECT
        DESIGNACAO,
        PK_ESTADO
      FROM FK2_MGD_ESTADO_LANCAMENTO_PAUTA
    `;

    const result = await this.dataSource.query(sql);
    console.log(result);

    return result.map((row: any) => ({
      codigo: row.PK_ESTADO,
      designacao: row.DESIGNACAO,
    }));
  }
}
