// book_test.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCalendarioProvaDto } from './dto/CreateCalendarioProvaDto';
import { UpdateCalendarioProvaDto } from './dto/UpdateCalendarioProvaDto';
import oracledb from 'oracledb';
@Injectable()
export class BookTestService {
  constructor(private readonly dataSource: DataSource) {}

  async obterPrazo(prazoId: number): Promise<string> {
    const sqlObterPrazo = `
      select
        pz.PK_PRAZO           as prazoId,
        pz.FK_TIPO_AVALIACAO  as avaliacao,
        pz.FK_SEMESTRE        as semestreId,
        pz.FK_TIPO_PRAZO      as tipoPrazoId,
        pz.FK_ANO_LECTIVO     as anoLectivo,
        tp.DESIGNACAO         as tipoPrazoDesignacao,
        av.DESIGNACAO         as avaliacaoDesignacao,
        an.DESIGNACAO         as anoLectivoDesignacao,
        s.DESIGNACAO          as semestre
      from FK2_MCAL_TB_PRAZO pz
      inner join FK2_MCAL_TB_TIPO_AVALIACAO av on av.PK_TIPO_AVALIACAO = pz.FK_TIPO_AVALIACAO
      inner join FK2_MCAL_TB_TIPO_PRAZO     tp on tp.PK_TIPO_PRAZO     = pz.FK_TIPO_PRAZO
      inner join FK2_MCAL_TB_SEMESTRE       s  on s.PK_SEMESTRE        = pz.FK_SEMESTRE
      inner join FK2_TB_ANO_LECTIVO         an on an.codigo            = pz.FK_ANO_LECTIVO
      where 1=1
      and  pz.PK_PRAZO = :prazoId
    `;
    const result = await this.dataSource.query(sqlObterPrazo, {
      prazoId,
    } as any);

    const row = result?.[0];
    if (!row) {
      throw new Error(`Não foi encontrado um prazo com id  ${prazoId}`);
    }
    const prazo = {
      pk_prazo: row?.PRAZOID,
      semestre: row?.SEMESTRE,
      tipoPrazo: row?.TIPOPRAZODESIGNACAO,
      anoLectivo: row?.ANOLECTIVODESIGNACAO,
      activeState: true,
      pk_semestre: row?.SEMESTREID,
      pk_tipoPrazo: row?.TIPOPRAZOID,
      tipoAvalicao: row?.AVALIACAODESIGNACAO,
      pk_anoLectivo: row?.ANOLECTIVO,
      pk_tipoAvalicao: row?.AVALIACAO,
    };
    return JSON.stringify(prazo);
  }

  async obterHorario(horarioId: number): Promise<string> {
    const sqlHorarios = `select
        DESIGNACAO as DESIGNACAO,
        PK_HORARIO as CODIGO
        from FK2_MGH_TB_HORARIO  where PK_HORARIO = :horarioId`;
    const result = await this.dataSource.query(sqlHorarios, {
      horarioId,
    } as any);
    const row = result?.[0];
    if (!row) {
      throw new BadRequestException(
        `Não foi encontrado um horario com id  ${horarioId}`,
      );
    }
    const horario = {
      pk: horarioId,
      desc: row?.DESIGNACAO,
    };
    return JSON.stringify(horario);
  }
  async obterUtilizador(userId: number): Promise<string> {
    const result = await this.dataSource.query(
      `select NOME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
      [userId],
    );
    const row = result?.[0];
    if (!row) {
      throw new BadRequestException(
        `Utilizador não encontrado para o código ${userId}`,
      );
    }
    const ref_json_utilizador = {
      pk: userId,
      desc: row.NOME,
    };

    return JSON.stringify(ref_json_utilizador);
  }
  private async obterCodigoDisciplinaByGrade(gradeId: number) {
    const result = await this.dataSource.query(
      'select codigo_disciplina from fk2_tb_grade_curricular where codigo = :gradeId',
      [gradeId],
    );
    const row = result?.[0];
    if (!row) {
      throw new BadRequestException(`Disciplina não encontrada`);
    }
    return row?.CODIGO_DISCIPLINA;
  }

  async createCalendarioProva(dto: CreateCalendarioProvaDto) {
    const ref_json_prazo = await this.obterPrazo(dto.prazoId);
    const ref_json_horario = await this.obterHorario(dto.Horario);
    const ref_json_utilizador = await this.obterUtilizador(
      dto.codigoUtilizador,
    );

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
        TO_DATE('1900-01-01','YYYY-MM-DD') + (:duracaoProva * 60) / 86400,
        TO_DATE(:horaTermino,'HH24:MI'),
        TO_DATE(:horaProva,'HH24:MI'),
        :vigilante,
        :url,
        :estado,
        :refUtilizador,
        :refHorario,
        :refPrazo
      )RETURNING CODIGO INTO :outId
    `;

    try {
      const codigoDisciplina = await this.obterCodigoDisciplinaByGrade(
        dto.codigoDisciplina,
      );
      const result = await this.dataSource.query(sql, {
        codigoCalendario: dto.codigoCalendario,
        codigoTipoProva: dto.codigoTipoProva,
        codigoModalidade: dto.codigoModalidade,
        codigoTurma: null,
        codigoSala: dto.codigoSala,
        codigoUtilizador: dto.codigoUtilizador,
        codigoPeriodo: dto.codigoPeriodo,
        codigoDisciplina: codigoDisciplina,
        dataProva: dto.dataProva,
        duracaoProva: dto.duracaoProva,
        horaTermino: dto.horaTermino,
        horaProva: dto.horaProva,
        vigilante: '',
        url: dto.url || null,
        estado: 1,
        refUtilizador: ref_json_utilizador,
        refHorario: ref_json_horario,
        refPrazo: ref_json_prazo,
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
          ESTADO_AGENDAMENTO
        ) VALUES (
          :calendarioProva,
          :vigilante,
          SYSDATE,
          :status,
          :codigoUtilizadorRegisto,
          :refVigilante,
          :refUtilizadorRegisto,
          NULL,
          :estadoAgendamento
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
          codigoUtilizadorRegisto: dto.codigoUtilizador,
          refVigilante: JSON.stringify({
            pk: vig.codigoUtilizador,
            desc: vig.desc,
            corLetra: 'black',
            disponivel: true,
          }),
          refUtilizadorRegisto: ref_json_utilizador,
          estadoAgendamento: 1,
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
    } catch (error: any) {
      console.error('Erro ao inserir calendário de prova:', error);
      throw new Error(`Falha ao criar calendário de prova: ${error?.message}`);
    }
  }
  async deleteCalendarioProva(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `DELETE FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE WHERE CALENDARIO_PROVA = :codigoCalendario`,
        { codigoCalendario: id } as any,
      );
      await queryRunner.query(
        `DELETE FROM FK2_TB_CALENDARIO_PROVA WHERE CODIGO = :codigoCalendario`,
        { codigoCalendario: id } as any,
      );
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao editar calendário de prova:', error);
      throw new Error(`Falha ao editar calendário de prova: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
  async editarCalendarioProva(dto: UpdateCalendarioProvaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existente = await queryRunner.query(
        `SELECT CODIGO FROM FK2_TB_CALENDARIO_PROVA WHERE CODIGO = :codigoCalendario`,
        { codigoCalendario: dto.codigoCalendario } as any,
      );
      if (!existente || existente.length === 0) {
        throw new BadRequestException(
          `Não foi encontrado calendário de prova com código ${dto.codigoCalendario}`,
        );
      }

      const campos: string[] = [];
      const params: Record<string, any> = {
        codigoCalendario: dto.codigoCalendario,
      };

      if (dto.codigoTipoProva !== undefined) {
        campos.push('CODIGO_TIPO_PROVA = :codigoTipoProva');
        params.codigoTipoProva = dto.codigoTipoProva;
      }
      if (dto.codigoModalidade !== undefined) {
        campos.push('CODIGO_MODALIDADE = :codigoModalidade');
        params.codigoModalidade = dto.codigoModalidade;
      }
      if (dto.codigoSala !== undefined) {
        campos.push('CODIGO_SALA = :codigoSala');
        params.codigoSala = dto.codigoSala;
      }
      if (dto.codigoPeriodo !== undefined) {
        campos.push('CODIGO_PERIODO = :codigoPeriodo');
        params.codigoPeriodo = dto.codigoPeriodo;
      }
      if (dto.dataProva !== undefined) {
        campos.push(`DATA_PROVA = TO_DATE(:dataProva, 'YYYY-MM-DD')`);
        params.dataProva = dto.dataProva;
      }
      if (dto.duracaoProva !== undefined) {
        campos.push(
          `DURACAOPROVA = TO_DATE('1900-01-01','YYYY-MM-DD') + (:duracaoProva * 60) / 86400`,
        );
        params.duracaoProva = dto.duracaoProva;
      }
      if (dto.horaTermino !== undefined) {
        campos.push(`HORA_TERMINO = TO_DATE(:horaTermino,'HH24:MI')`);
        params.horaTermino = dto.horaTermino;
      }
      if (dto.horaProva !== undefined) {
        campos.push(`HORA_PROVA = TO_DATE(:horaProva,'HH24:MI')`);
        params.horaProva = dto.horaProva;
      }
      if (dto.url !== undefined) {
        campos.push('URL = :url');
        params.url = dto.url;
      }

      if (dto.codigoDisciplina !== undefined) {
        const codigoDisciplina = await this.obterCodigoDisciplinaByGrade(
          dto.codigoDisciplina,
        );
        campos.push('CODIGO_DISCIPLINA = :codigoDisciplina');
        params.codigoDisciplina = codigoDisciplina;
      }

      if (dto.Horario !== undefined) {
        const refHorario = await this.obterHorario(dto.Horario);
        campos.push('REF_HORARIO = :refHorario');
        params.refHorario = refHorario;
      }

      if (dto.prazoId !== undefined) {
        const refPrazo = await this.obterPrazo(dto.prazoId);
        campos.push('REF_PRAZO = :refPrazo');
        params.refPrazo = refPrazo;
      }

      let refUtilizadorAtual: string | null = null;
      if (dto.codigoUtilizador !== undefined) {
        refUtilizadorAtual = await this.obterUtilizador(dto.codigoUtilizador);
        campos.push('CODIGO_UTILIZADOR = :codigoUtilizador');
        campos.push('REF_UTILIZADOR = :refUtilizador');
        params.codigoUtilizador = dto.codigoUtilizador;
        params.refUtilizador = refUtilizadorAtual;
      }

      if (campos.length > 0) {
        const sqlUpdate = `
          UPDATE FK2_TB_CALENDARIO_PROVA
          SET ${campos.join(',\n              ')}
          WHERE CODIGO = :codigoCalendario
        `;
        await queryRunner.query(sqlUpdate, params as any);
      }

      if (dto.vigilantes !== undefined) {
        const refUtilizadorRegisto =
          refUtilizadorAtual ??
          (dto.codigoUtilizador !== undefined
            ? await this.obterUtilizador(dto.codigoUtilizador)
            : null);

        await queryRunner.query(
          `DELETE FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE WHERE CALENDARIO_PROVA = :codigoCalendario`,
          { codigoCalendario: dto.codigoCalendario } as any,
        );

        if (dto.vigilantes.length > 0) {
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
              ESTADO_AGENDAMENTO
            ) VALUES (
              :calendarioProva,
              :vigilante,
              SYSDATE,
              :status,
              :codigoUtilizadorRegisto,
              :refVigilante,
              :refUtilizadorRegisto,
              NULL,
              :estadoAgendamento
            )
          `;

          for (const vig of dto.vigilantes) {
            await queryRunner.query(sqlv, {
              calendarioProva: dto.codigoCalendario,
              vigilante: vig.codigoUtilizador,
              status: 1,
              codigoUtilizadorRegisto: dto.codigoUtilizador ?? null,
              refVigilante: JSON.stringify({
                pk: vig.codigoUtilizador,
                desc: vig.desc,
                corLetra: 'black',
                disponivel: true,
              }),
              refUtilizadorRegisto,
              estadoAgendamento: 1,
            } as any);
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Calendário de prova atualizado com sucesso',
        data: {
          codigoCalendario: dto.codigoCalendario,
        },
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao editar calendário de prova:', error);
      throw new Error(`Falha ao editar calendário de prova: ${error.message}`);
    } finally {
      await queryRunner.release();
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
