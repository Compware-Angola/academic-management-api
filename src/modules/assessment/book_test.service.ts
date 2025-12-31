// book_test.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCalendarioProvaDto } from './dto/CreateCalendarioProvaDto';
import oracledb from 'oracledb';
@Injectable()
export class BookTestService {
  constructor(private readonly dataSource: DataSource) {}

  async createCalendarioProva(dto: CreateCalendarioProvaDto) {
    const ref_json_utilizador = {
      pk: dto.utilizador || dto.codigoUtilizador,
      desc: dto.descUtilizador,
      corLetra: 'black',
      disponivel: false,
    };

    const ref_json_horario = {
      pk: dto.Horario,
      desc: dto.descHorario,
      corLetra: 'black',
      disponivel: false,
    };
    const sqlPrazo = `select * from FK2_MCAL_TB_PRAZO
where 1=1
and FK_TIPO_AVALIACAO =${dto.tipoAvaliacao}
and FK_SEMESTRE = ${dto.semestre}
and FK_TIPO_PRAZO = ${dto.tipoPrazo}
and FK_ANO_LECTIVO = ${dto.anoLectivo}
and ACTIVE_STATE = 1
and TIPO_CANDIDATURA = ${dto.tipoCandidatura}
fetch first 1 row only`;
    const prazo = await this.dataSource.query(sqlPrazo);

    const ref_json_prazo = {
      pk_prazo: prazo[0].PK_PRAZO,
      semestre: `${dto.semestre}º Semestre`,
      tipoPrazo: ' ',
      anoLectivo: this.extrairAnoLectivoDescDoPrazo(prazo[0].REF_ANO_LECTIVO),
      activeState: 'true',
      pk_semestre: dto.semestre,
      pk_tipoPrazo: dto.tipoPrazo,
      tipoAvalicao: '',
      pk_anoLectivo: dto.anoLectivo,
      pk_tipoAvalicao: dto.tipoAvaliacao,
    };

    const sql = `
      INSERT INTO FK2_TB_CALENDARIO_PROVA (
        CODIGO_CALENDARIO,
        CODIGO_TIPO_PROVA,
        CODIGO_MODALIDADE,
        CODIGO_TURMA,
        CODIGO_SALA,
        CODIGO_UTILIZADOR,
        CODIGO_PERIODO,
        CODIGO_DISCIPLINA,
        DATA_PROVA,
        DURACAOPROVA,
        HORA_TERMINO,
        HORA_PROVA,
        VIGILANTE,
        URL,
        ESTADO,
        REF_UTILIZADOR,
        REF_HORARIO,
        REF_PRAZO
      ) VALUES (
        :codigoCalendario,
        :codigoTipoProva,
        :codigoModalidade,
        :codigoTurma,
        :codigoSala,
        :codigoUtilizador,
        :codigoPeriodo,
        :codigoDisciplina,
        TO_DATE(:dataProva, 'YYYY-MM-DD'),
        :duracaoProva,
        :horaTermino,
        :horaProva,
        :vigilante,
        :url,
        :estado,
        :refUtilizador,
        :refHorario,
        :refPrazo
      )RETURNING CODIGO INTO :outId
    `;

    try {
      const result = await this.dataSource.query(sql, {
        codigoCalendario: dto.codigoCalendario,
        codigoTipoProva: dto.codigoTipoProva,
        codigoModalidade: dto.codigoModalidade,
        codigoTurma: null,
        codigoSala: dto.codigoSala,
        codigoUtilizador: dto.codigoUtilizador,
        codigoPeriodo: dto.codigoPeriodo,
        codigoDisciplina: dto.codigoDisciplina,
        dataProva: dto.dataProva,
        duracaoProva: dto.duracaoProva,
        horaTermino: dto.horaTermino,
        horaProva: dto.horaProva,
        vigilante: '',
        url: dto.url || null,
        estado: 1,
        refUtilizador: JSON.stringify(ref_json_utilizador),
        refHorario: JSON.stringify(ref_json_horario),
        refPrazo: JSON.stringify(ref_json_prazo),
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any);

      if (!result.outId || result.outId.length === 0) {
        throw new BadRequestException(
          'Falha ao obter o código do calendário inserido.',
        );
      }

      const sqlv = `
  INSERT INTO FK2_TB_CALENDARIO_PROVA_VIGILANTE (
    CALENDARIO_PROVA,
    VIGILANTE,
    DATA,
    STATUS_,
    CODIGO_UTILIZADOR_REGISTO,
    REF_VIGILANTE,
    REF_UTILIZADOR_REGISTOU,
    REF_SUMARISTA,
    ESTADO_AGENDAMENTO,
    CODIGO
  ) VALUES (
    :calendarioProva,
    :vigilante,
    SYSDATE,
    :status,
    :codigoUtilizadorRegisto,
    :refVigilante,
    :refUtilizadorRegisto,
    NULL,
    :estadoAgendamento,
    :codigo
  )
`;
      // Dentro do seu método, antes do loop
      let proximoCodigo = await this.obterProximoCodigoVigilante();

      // Loop
      for (const vig of dto.vigilantes) {
        await this.dataSource.query(sqlv, {
          calendarioProva: result.outId[0],
          vigilante: vig.codigoUtilizador,
          status: 1,
          codigoUtilizadorRegisto: 1192, // ex: 1192
          refVigilante: JSON.stringify({
            pk: vig.codigoUtilizador,
            desc: vig.desc,
            corLetra: 'black',
            disponivel: true,
          }),
          refUtilizadorRegisto: JSON.stringify({
            pk: 1192,
            desc: 'Nome de quem registrou',
            corLetra: 'black',
            disponivel: false,
          }),
          estadoAgendamento: 1,
          codigo: proximoCodigo,
        } as any);

        proximoCodigo++;
      }

      return {
        success: true,
        message: 'Calendário de prova criado com sucesso',
        data: {
          codigoCalendario: result.outId[0],
        },
      };
    } catch (error) {
      console.error('Erro ao inserir calendário de prova:', error);
      throw new Error(`Falha ao criar calendário de prova: ${error.message}`);
    }
  }
  private async obterProximoCodigoVigilante(): Promise<number> {
    const result = await this.dataSource.query(`
    SELECT NVL(MAX(CODIGO), 0) + 1 AS proximo_codigo
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE
  `);

    return Number(result[0].PROXIMO_CODIGO);
  }

  private extrairAnoLectivoDescDoPrazo(anoLectivo: string): string | null {
    try {
      if (!anoLectivo) return null;
      const obj = JSON.parse(anoLectivo);
      return obj.desc ? String(obj.desc) : null;
    } catch (e) {
      console.warn('inválido ou não é JSON:', anoLectivo);
      return null;
    }
  }
}
