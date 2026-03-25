import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { FilterCandidatoDto } from './dto/filter-candidato.dto';
import { DataSource } from 'typeorm';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';

import { FilterCandidatoProvaDto } from './dto/filter-candidato-prova.dto';
import { FilterProvaHoraDto } from './dto/filter-prova-hora.dto';
import { FilterProvaResultadoDto } from './dto/filter-prova-resultado.dto';
import { FilterProvaMarcacaoDto } from './dto/filter-prova-marcacao.dto';
import { gerarHashExterno } from '../util/hash.util';

@Injectable()
export class ExamesDeAcessoService {
  constructor(private readonly dataSource: DataSource) { }

  async buscaCandidatos(filtros: FilterCandidatoDto) {
    const condicoes: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.codigoFaculdade) {
      condicoes.push(`FK2_TB_CURSOS.FACULDADE_ID = :${paramIndex++}`);
      params.push(filtros.codigoFaculdade);
    }

    if (filtros.codigoAnoLetivo) {
      condicoes.push(`FK2_USERS.ANO_LECTIVO_ID = :${paramIndex++}`);
      params.push(filtros.codigoAnoLetivo);
    }

    if (filtros.codigoCurso) {
      condicoes.push(
        `FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = :${paramIndex++}`,
      );
      params.push(filtros.codigoCurso);
    }

    if (filtros.codigoCandidato) {
      condicoes.push(`FK2_TB_PREINSCRICAO.CODIGO = :${paramIndex++}`);
      params.push(filtros.codigoCandidato);
    }

    if (filtros.codigoTurno) {
      condicoes.push(`FK2_TB_PREINSCRICAO.CODIGO_TURNO = :${paramIndex++}`);
      params.push(filtros.codigoTurno);
    }
    if (filtros.search) {
      const searchIndex1 = paramIndex++;
      const searchIndex2 = paramIndex++;
      condicoes.push(
        `(UPPER(FK2_TB_PREINSCRICAO.NOME_COMPLETO) LIKE UPPER(:${searchIndex1}) OR UPPER(FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE) LIKE UPPER(:${searchIndex2}))`,
      );
      params.push(`%${filtros.search}%`);
      params.push(`%${filtros.search}%`);
    }

    const extraWhere =
      condicoes.length > 0 ? condicoes.map((c) => ` AND ${c}`).join('') : '';

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const offset = (page - 1) * limit;

    const offsetIndex = paramIndex++;
    const limitIndex = paramIndex++;

    params.push(offset);
    params.push(limit);

    const sql = `
      SELECT DISTINCT FK2_TB_PREINSCRICAO.CODIGO               NUMERO_INSCRICAO
           , FK2_TB_PREINSCRICAO.NOME_COMPLETO                 NOME
           , FK2_TB_PREINSCRICAO.CONTACTOS_TELEFONICOS         CONTATO
           , FK2_TB_PREINSCRICAO.CONTACTO_DE_EMERGENCIA        CONTATO_EMERGENCIA
           , FK2_TB_PREINSCRICAO.EMAIL
           , FK2_TB_PREINSCRICAO.MORADA_COMPLETA
           , FK2_TB_PREINSCRICAO.DATA_PREESCRINCAO
           , FK2_TB_PREINSCRICAO.SEXO
           , FK2_TB_PREINSCRICAO.ESTADO_CIVIL
           , FK2_TB_PREINSCRICAO.CODIGO_NACIONALIDADE
           , FK2_TB_NACIONALIDADES.DESIGNACAO                  NACIONALIDADE
           , FK2_TB_PREINSCRICAO.PAI NOME_PAI
           , FK2_TB_PREINSCRICAO.PROFISSAO_PAI CODIGO_PROFISSAO_PAI
           , (SELECT DESIGNACAO FROM FK2_TB_PROFISSAO WHERE FK2_TB_PROFISSAO.CODIGO = FK2_TB_PREINSCRICAO.PROFISSAO_PAI) PROFISSAO_PAI
           , FK2_TB_PREINSCRICAO.MAE NOME_MAE
           , FK2_TB_PREINSCRICAO.PROFISSAO_MAE CODIGO_PROFISSAO_MAE
           , (SELECT DESIGNACAO FROM FK2_TB_PROFISSAO WHERE FK2_TB_PROFISSAO.CODIGO = FK2_TB_PREINSCRICAO.PROFISSAO_PAI) PROFISSAO_MAE
           , FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE            NUMERO_BILHETE
           , FK2_USERS.ANO_LECTIVO_ID                          CODIGO_ANO_LECTIVO
           , FK2_TB_ANO_LECTIVO.DESIGNACAO                     ANO_LECTIVO
           , FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA             CODIGO_CURSO
           , FK2_TB_CURSOS.DESIGNACAO                          CURSO
           , FK2_TB_PREINSCRICAO.CURSOOPCIONAL1_ID             CODIGO_CURSO_OPCIONAL_1
           , (SELECT FK2_TB_CURSOS.DESIGNACAO FROM FK2_TB_CURSOS
               WHERE FK2_TB_CURSOS.CODIGO = FK2_TB_PREINSCRICAO.CURSOOPCIONAL1_ID) CURSO_OPCIONAL_1
           , FK2_TB_PREINSCRICAO.CURSOOPCIONAL2_ID             CODIGO_CURSO_OPCIONAL_2
           , (SELECT FK2_TB_CURSOS.DESIGNACAO FROM FK2_TB_CURSOS
               WHERE FK2_TB_CURSOS.CODIGO = FK2_TB_PREINSCRICAO.CURSOOPCIONAL2_ID) CURSO_OPCIONAL_2
           , FK2_TB_PREINSCRICAO.MEDIA_FINAL
           , FK2_TB_PREINSCRICAO.CODIGO_TURNO                  CODIGO_PERIODO
           , FK2_TB_PERIODOS.DESIGNACAO                        PERIODO
           , FK2_TB_PREINSCRICAO.CODIGO_TURNO_OPTIONAL         CODIGO_PERIODO_OPCIONAL
           , (SELECT FK2_TB_PERIODOS.DESIGNACAO FROM FK2_TB_PERIODOS
               WHERE FK2_TB_PERIODOS.CODIGO = FK2_TB_PREINSCRICAO.CODIGO_TURNO_OPTIONAL) PERIODO_OPCIONAL
           , FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA
           , FK2_TB_TIPO_CANDIDATURA.DESIGNACAO TIPO_CANDIDATURA
        FROM FK2_TB_PREINSCRICAO
           , FK2_TB_ANO_LECTIVO
           , FK2_TB_CURSOS
           , FK2_TB_PERIODOS
           , FK2_TB_NACIONALIDADES
           , FK2_USERS
           , FK2_TB_TIPO_CANDIDATURA 
           , FK2_TB_FACULDADE
       WHERE FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA       = FK2_TB_CURSOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO_NACIONALIDADE    = FK2_TB_NACIONALIDADES.CODIGO
         AND FK2_TB_PREINSCRICAO.USER_ID                 = FK2_USERS.ID
         AND FK2_USERS.ANO_LECTIVO_ID                    = FK2_TB_ANO_LECTIVO.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO_TURNO            = FK2_TB_PERIODOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = FK2_TB_TIPO_CANDIDATURA.ID
         AND FK2_TB_CURSOS.FACULDADE_ID                  = FK2_TB_FACULDADE.CODIGO
         ${extraWhere}
       ORDER BY FK2_TB_PREINSCRICAO.NOME_COMPLETO
       OFFSET :${offsetIndex} ROWS
       FETCH NEXT :${limitIndex} ROWS ONLY
    `;

    const [data, total] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(
        `SELECT COUNT(*) TOTAL
           FROM FK2_TB_PREINSCRICAO
              , FK2_TB_ANO_LECTIVO
              , FK2_TB_CURSOS
              , FK2_TB_PERIODOS
              , FK2_TB_NACIONALIDADES
              , FK2_USERS
              , FK2_TB_TIPO_CANDIDATURA
          WHERE FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA      = FK2_TB_CURSOS.CODIGO
            AND FK2_TB_PREINSCRICAO.CODIGO_NACIONALIDADE   = FK2_TB_NACIONALIDADES.CODIGO
            AND FK2_TB_PREINSCRICAO.USER_ID                = FK2_USERS.ID
            AND FK2_USERS.ANO_LECTIVO_ID                   = FK2_TB_ANO_LECTIVO.CODIGO
            AND FK2_TB_PREINSCRICAO.CODIGO_TURNO           = FK2_TB_PERIODOS.CODIGO
           AND FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = FK2_TB_TIPO_CANDIDATURA.ID
            ${extraWhere}`,
        params.slice(0, -2),
      ),
    ]);

    const documentos = await this.buscaDocumentosDeCandidatos(
      data.map((c) => c.NUMERO_INSCRICAO),
    );

    const documentosPorCandidato = new Map<number, any[]>();
    for (const doc of documentos) {
      const lista = documentosPorCandidato.get(doc.CANDIDATO_ID) ?? [];
      lista.push(doc);
      documentosPorCandidato.set(doc.CANDIDATO_ID, lista);
    }

    const dataComDocumentos = data.map((candidato) => ({
      ...candidato,
      documentos: documentosPorCandidato.get(candidato.NUMERO_INSCRICAO) ?? [],
    }));

    return this.toLower({
      data: dataComDocumentos,
      total: Number(total[0].TOTAL),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
    });
  }

  private async buscaDocumentosDeCandidatos(ids: number[]) {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `:${i + 1}`).join(', ');

    const sql = `
    SELECT FK2_DOCUMENTOS_ADMISSAO.ID
         , FK2_DOCUMENTOS_ADMISSAO.TIPO_DOCUMENTO_ID            CODIGO_DOCUMENTO
         , FK2_TB_TIPO_DOCUMENTOS.DESIGNACAO                    TIPO_DOCUMENTO
         , FK2_DOCUMENTOS_ADMISSAO.NOME_ARQUIVO                 LINK
        , FK2_DOCUMENTOS_ADMISSAO.CANDIDATO_ID                 CANDIDATO_ID
      FROM FK2_DOCUMENTOS_ADMISSAO
         , FK2_TB_TIPO_DOCUMENTOS
     WHERE FK2_DOCUMENTOS_ADMISSAO.TIPO_DOCUMENTO_ID = FK2_TB_TIPO_DOCUMENTOS.CODIGO
       AND FK2_DOCUMENTOS_ADMISSAO.CANDIDATO_ID IN (${placeholders})
  `;

    return this.dataSource.query(sql, ids);
  }

  async atualizaCandidato(dto: UpdateCandidatoDto, codigoCandidato: number) {
    const campos: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.nomePai !== undefined) {
      campos.push(`PAI = :${paramIndex++}`);
      params.push(dto.nomePai);
    }

    if (dto.nomeMae !== undefined) {
      campos.push(`MAE = :${paramIndex++}`);
      params.push(dto.nomeMae);
    }

    if (dto.codigoProfissaoPai !== undefined) {
      campos.push(`PROFISSAO_PAI = :${paramIndex++}`);
      params.push(dto.codigoProfissaoPai);
    }

    if (dto.codigoProfissaoMae !== undefined) {
      campos.push(`PROFISSAO_MAE = :${paramIndex++}`);
      params.push(dto.codigoProfissaoMae);
    }

    if (dto.codigoCurso !== undefined) {
      campos.push(`CURSO_CANDIDATURA = :${paramIndex++}`);
      params.push(dto.codigoCurso);
    }

    if (dto.codigoCursoOpcional1 !== undefined) {
      campos.push(`CURSOOPCIONAL1_ID = :${paramIndex++}`);
      params.push(dto.codigoCursoOpcional1);
    }

    if (dto.codigoCursoOpcional2 !== undefined) {
      campos.push(`CURSOOPCIONAL2_ID = :${paramIndex++}`);
      params.push(dto.codigoCursoOpcional2);
    }

    if (dto.mediaFinal !== undefined) {
      campos.push(`MEDIA_FINAL = :${paramIndex++}`);
      params.push(dto.mediaFinal);
    }

    if (dto.telefone !== undefined) {
      campos.push(`CONTACTOS_TELEFONICOS = :${paramIndex++}`);
      params.push(dto.telefone);
    }

    if (dto.telefoneEmergencia !== undefined) {
      campos.push(`CONTACTO_DE_EMERGENCIA = :${paramIndex++}`);
      params.push(dto.telefoneEmergencia);
    }

    if (dto.email !== undefined) {
      campos.push(`EMAIL = :${paramIndex++}`);
      params.push(dto.email);
    }

    if (dto.morada !== undefined) {
      campos.push(`MORADA_COMPLETA = :${paramIndex++}`);
      params.push(dto.morada);
    }

    if (dto.codigoTurno !== undefined) {
      campos.push(`CODIGO_TURNO = :${paramIndex++}`);
      params.push(dto.codigoTurno);
    }

    if (dto.codigoTurnoOpcional !== undefined) {
      campos.push(`CODIGO_TURNO_OPTIONAL = :${paramIndex++}`);
      params.push(dto.codigoTurnoOpcional);
    }

    if (dto.codigoTipoCandidatura !== undefined) {
      campos.push(`CODIGO_TIPO_CANDIDATURA = :${paramIndex++}`);
      params.push(dto.codigoTipoCandidatura);
    }

    if (dto.senha) {
      await this.atualizarSenhaSeAnoLetivoAtivo(dto, codigoCandidato);
    }

    if (campos.length === 0) {
      return;
    }

    const whereIndex = paramIndex++;
    params.push(codigoCandidato);

    const sql = `
    UPDATE FK2_TB_PREINSCRICAO
       SET ${campos.join(',           ')}
     WHERE CODIGO = :${whereIndex}
  `;

    await this.dataSource.query(sql, params);

    return this.buscaCandidatos({ codigoCandidato, page: 1, limit: 1 });
  }

  private async atualizarSenhaSeAnoLetivoAtivo(dto: UpdateCandidatoDto, codigoCandidato: number) {
    const sqlSelect = `
    SELECT FK2_TB_PREINSCRICAO.USER_ID AS USER_ID
         , FK2_TB_ANO_LECTIVO.STATUS_  AS ESTADO_ANO_LECTIVO
      FROM FK2_TB_PREINSCRICAO
         , FK2_USERS
         , FK2_TB_ANO_LECTIVO
     WHERE FK2_TB_PREINSCRICAO.USER_ID = FK2_USERS.ID
       AND FK2_USERS.ANO_LECTIVO_ID    = FK2_TB_ANO_LECTIVO.CODIGO
       AND FK2_TB_PREINSCRICAO.CODIGO  = :1
  `;

    const rows = await this.dataSource.query(sqlSelect, [
      codigoCandidato,
    ]);

    if (!rows.length) {
      return;
    }

    const { USER_ID, ESTADO_ANO_LECTIVO } = rows[0];

    // if (ESTADO_ANO_LECTIVO !== 1) {
    //   return;
    // }

    const senhaHash = await this.hashSenha(dto.senha ?? '');

    const sqlUpdate = `
    UPDATE FK2_USERS
       SET PASSWORD = :1
     WHERE ID = :2
  `;

    await this.dataSource.query(sqlUpdate, [senhaHash, USER_ID]);
  }

  private async hashSenha(valor: string): Promise<string> {
    return gerarHashExterno(valor);
  }

  async buscaCandidatosProvas(filtros: FilterCandidatoProvaDto) {
    const condicoes: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.codigoSala) {
      condicoes.push(`FK2_TB_SALAS.CODIGO = :${paramIndex++}`);
      params.push(filtros.codigoSala);
    }

    if (filtros.codigoCurso) {
      condicoes.push(`FK2_TB_CURSOS.CODIGO = :${paramIndex++}`);
      params.push(filtros.codigoCurso);
    }

    if (filtros.dataRealizacao) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.DATA_REALIZACAO = TO_DATE(:${paramIndex++}, 'DD/MM/YYYY')`);
      params.push(filtros.dataRealizacao);
    }

    if (filtros.horaInicio) {
      const [hh, mm, ss] = filtros.horaInicio.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      condicoes.push(
        `TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)) = :${paramIndex++}`,
      );
      params.push(nanos);
    }

    if (filtros.codigoAnoLetivo) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = :${paramIndex++}`);
      params.push(filtros.codigoAnoLetivo);
    }

    const extraWhere =
      condicoes.length > 0 ? condicoes.map((c) => `AND ${c}`).join('\n') : '';

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const offset = (page - 1) * limit;

    const offsetIndex = paramIndex++;
    const limitIndex = paramIndex++;
    params.push(offset, limit);

    const sqlBase = `
    FROM FK2_TB_PREINSCRICAO
       , FK2_TB_CURSOS
       , FK2_CANDIDATO_PROVAS
       , FK2_TB_HORARIO_PROVA
       , FK2_TB_SALAS
       , FK2_TB_ANO_LECTIVO
   WHERE FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = FK2_TB_CURSOS.CODIGO
     AND FK2_CANDIDATO_PROVAS.CANDIDATO_ID = FK2_TB_PREINSCRICAO.CODIGO
     AND FK2_TB_HORARIO_PROVA.ID = FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID
     AND FK2_TB_SALAS.CODIGO = FK2_TB_HORARIO_PROVA.SALA_ID
     AND FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = FK2_TB_ANO_LECTIVO.CODIGO
     ${extraWhere}
  `;

    const sql = `
  SELECT FK2_TB_PREINSCRICAO.CODIGO AS NUMERO_INSCRICAO
       , FK2_TB_PREINSCRICAO.NOME_COMPLETO NOME
       , FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE NUMERO_BILHETE
       , FK2_TB_CURSOS.CODIGO AS CODIGO_CURSO
       , FK2_TB_CURSOS.DESIGNACAO AS CURSO
       , FK2_TB_SALAS.CODIGO AS CODIGO_SALA
       , FK2_TB_SALAS.DESIGNACAO AS SALA
       , FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID AS CODIGO_ANO_LECTIVO
       , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
       , TO_CHAR(FK2_TB_HORARIO_PROVA.DATA_REALIZACAO, 'DD/MM/YYYY') AS DATA_REALIZACAO
       , SUBSTR(TO_CHAR(NUMTODSINTERVAL(
          TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)) / 86400000000000,
          'DAY'
        )), 12, 5) AS HORA_INICIO

  ${sqlBase}
  ORDER BY FK2_TB_PREINSCRICAO.NOME_COMPLETO
  OFFSET :${offsetIndex} ROWS
  FETCH NEXT :${limitIndex} ROWS ONLY
  `;

    const sqlCount = `SELECT COUNT(*) AS TOTAL ${sqlBase}`;

    const [data, total] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params.slice(0, -2)),
    ]);

    return this.toLower({
      data,
      total: Number(total[0].TOTAL),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
    });
  }

  async buscaProvaHorarios(filtros: FilterProvaHoraDto) {
    const condicoes: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // obrigatório
    if (filtros.codigoAnoLetivo) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = :${paramIndex++}`);
      params.push(filtros.codigoAnoLetivo);
    }


    if (filtros.codigoCurso) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.CURSO_ID = :${paramIndex++}`);
      params.push(filtros.codigoCurso);
    }

    if (filtros.codigoTurno) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.PERIODO_ID = :${paramIndex++}`);
      params.push(filtros.codigoTurno);
    }

    const where = condicoes.map((c) => `AND ${c}`).join('\n');

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const offset = (page - 1) * limit;

    const offsetIndex = paramIndex++;
    const limitIndex = paramIndex++;
    params.push(offset, limit);

    const sqlBase = `
    FROM FK2_TB_HORARIO_PROVA
       , FK2_TB_ANO_LECTIVO
       , FK2_TB_CURSOS
       , FK2_TB_PERIODOS
       , FK2_TB_SALAS
   WHERE FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = FK2_TB_ANO_LECTIVO.CODIGO
     AND FK2_TB_HORARIO_PROVA.CURSO_ID       = FK2_TB_CURSOS.CODIGO
     AND FK2_TB_HORARIO_PROVA.PERIODO_ID     = FK2_TB_PERIODOS.CODIGO
     AND FK2_TB_HORARIO_PROVA.SALA_ID        = FK2_TB_SALAS.CODIGO
     ${where}
  `;

    const sql = `
  SELECT FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID AS CODIGO_ANO_LECTIVO
       , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
       , FK2_TB_HORARIO_PROVA.CURSO_ID AS CODIGO_CURSO
       , FK2_TB_CURSOS.DESIGNACAO AS CURSO
       , FK2_TB_HORARIO_PROVA.PERIODO_ID AS CODIGO_PERIODO
       , FK2_TB_PERIODOS.DESIGNACAO AS PERIODO
       , FK2_TB_HORARIO_PROVA.SALA_ID AS CODIGO_SALA
       , FK2_TB_SALAS.DESIGNACAO AS SALA
       , FK2_TB_SALAS.CAPACIDADE AS CAPACIDADE_SALA
       , TO_CHAR(FK2_TB_HORARIO_PROVA.DATA_REALIZACAO, 'DD/MM/YYYY') AS DATA_REALIZACAO
       , SUBSTR(TO_CHAR(NUMTODSINTERVAL(
           TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)) / 86400000000000,
           'DAY'
         )), 12, 5) AS HORA_INICIO
       , SUBSTR(TO_CHAR(NUMTODSINTERVAL(
           TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_FIM, 4000, 1)) / 86400000000000,
           'DAY'
         )), 12, 5) AS HORA_FIM
       , (SELECT COUNT(*)
            FROM FK2_CANDIDATO_PROVAS
           WHERE FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID = FK2_TB_HORARIO_PROVA.ID) AS QUANTIDADE_ALUNOS
  ${sqlBase}
  ORDER BY FK2_TB_HORARIO_PROVA.DATA_REALIZACAO
         , TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1))
  OFFSET :${offsetIndex} ROWS
  FETCH NEXT :${limitIndex} ROWS ONLY
  `;

    const sqlCount = `SELECT COUNT(*) AS TOTAL ${sqlBase}`;

    const [data, total] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params.slice(0, -2)),
    ]);

    return this.toLower({
      data,
      total: Number(total[0].TOTAL),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
    });
  }

  async buscaProvaResultados(filtros: FilterProvaResultadoDto) {
    const condicoes: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtros.search) {
      const searchIndex1 = paramIndex++;
      const searchIndex2 = paramIndex++;
      condicoes.push(
        `(UPPER(FK2_TB_PREINSCRICAO.NOME_COMPLETO) LIKE UPPER(:${searchIndex1}) OR UPPER(FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE) LIKE UPPER(:${searchIndex2}))`,
      );
      params.push(`%${filtros.search}%`);
      params.push(`%${filtros.search}%`);
    }

    if (filtros.codigoAnoLetivo) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = :${paramIndex++}`);
      params.push(filtros.codigoAnoLetivo);
    }

    if (filtros.dataInicio && filtros.dataFim) {
      const [dd1, mm1, yyyy1] = filtros.dataInicio.split('/');
      const [dd2, mm2, yyyy2] = filtros.dataFim.split('/');
      condicoes.push(
        `FK2_TB_HORARIO_PROVA.DATA_REALIZACAO BETWEEN TO_DATE('${dd1}/${mm1}/${yyyy1}', 'DD/MM/YYYY') AND TO_DATE('${dd2}/${mm2}/${yyyy2}', 'DD/MM/YYYY')`,
      );
    }
    // opcionais
    if (filtros.codigoFaculdade) {
      condicoes.push(`FK2_TB_CURSOS.FACULDADE_ID = :${paramIndex++}`);
      params.push(filtros.codigoFaculdade);
    }

    if (filtros.codigoCurso) {
      condicoes.push(
        `FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = :${paramIndex++}`,
      );
      params.push(filtros.codigoCurso);
    }

    if (filtros.codigoTurno) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.PERIODO_ID = :${paramIndex++}`);
      params.push(filtros.codigoTurno);
    }

    if (filtros.codigoSala) {
      condicoes.push(`FK2_TB_HORARIO_PROVA.SALA_ID = :${paramIndex++}`);
      params.push(filtros.codigoSala);
    }

    const where = condicoes.map((c) => `AND ${c}`).join('\n');

    const resultadoWhere =
      filtros.resultado !== undefined
        ? `WHERE RESULTADO = :${paramIndex++}`
        : '';

    if (filtros.resultado !== undefined) {
      params.push(filtros.resultado);
    }

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const offset = (page - 1) * limit;

    const offsetIndex = paramIndex++;
    const limitIndex = paramIndex++;
    params.push(offset, limit);

    const sqlBase = `
    FROM FK2_TB_PREINSCRICAO
       , FK2_TB_HORARIO_PROVA
       , FK2_TB_ANO_LECTIVO
       , FK2_TB_CURSOS
       , FK2_TB_PERIODOS
       , FK2_TB_SALAS
       , FK2_TB_FACULDADE
       , FK2_CANDIDATO_PROVAS
   WHERE FK2_TB_PREINSCRICAO.CODIGO            = FK2_CANDIDATO_PROVAS.CANDIDATO_ID
     AND FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID = FK2_TB_HORARIO_PROVA.ID
     AND FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID   = FK2_TB_ANO_LECTIVO.CODIGO
     AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = FK2_TB_CURSOS.CODIGO
     AND FK2_TB_HORARIO_PROVA.PERIODO_ID       = FK2_TB_PERIODOS.CODIGO
     AND FK2_TB_HORARIO_PROVA.SALA_ID          = FK2_TB_SALAS.CODIGO
     AND FK2_TB_CURSOS.FACULDADE_ID            = FK2_TB_FACULDADE.CODIGO
     AND FK2_CANDIDATO_PROVAS.STATUS_          = 1
     ${where}
  `;

    const sqlInner = `
    SELECT FK2_TB_PREINSCRICAO.CODIGO AS NUMERO_INSCRICAO
         , DBMS_LOB.SUBSTR(FK2_TB_PREINSCRICAO.NOME_COMPLETO, 4000, 1) AS NOME
         , DBMS_LOB.SUBSTR(FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE, 4000, 1) AS NUMERO_BILHETE
         , FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID AS CODIGO_ANO_LECTIVO
         , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
         , FK2_TB_HORARIO_PROVA.CURSO_ID AS CODIGO_CURSO
         , FK2_TB_CURSOS.DESIGNACAO AS CURSO
         , FK2_TB_HORARIO_PROVA.PERIODO_ID AS CODIGO_PERIODO
         , FK2_TB_PERIODOS.DESIGNACAO AS PERIODO
         , FK2_TB_HORARIO_PROVA.SALA_ID AS CODIGO_SALA
         , FK2_TB_SALAS.DESIGNACAO AS SALA
         , TO_CHAR(FK2_TB_HORARIO_PROVA.DATA_REALIZACAO, 'DD/MM/YYYY') AS DATA_REALIZACAO
         , FK2_TB_CURSOS.FACULDADE_ID AS CODIGO_FACULDADE
         , FK2_TB_FACULDADE.DESIGNACAO AS FACULDADE
         , FK2_CANDIDATO_PROVAS.NOTA
         , CASE
             WHEN FK2_CANDIDATO_PROVAS.NOTA < (SELECT OBSERVACAO FROM FK2_TB_PARAMETROS_GERAIS_MUTUE WHERE CODIGO = 38)
             THEN 0
             ELSE 1
           END AS RESULTADO
    ${sqlBase}
  `;

    const sql = `
    SELECT *
      FROM (${sqlInner})
    ${resultadoWhere}
    ORDER BY NOME
    OFFSET :${offsetIndex} ROWS
    FETCH NEXT :${limitIndex} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
      FROM (${sqlInner})
    ${resultadoWhere}
  `;

    const [data, total] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params.slice(0, -2)),
    ]);

    return this.toLower({
      data,
      total: Number(total[0].TOTAL),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
    });
  }

  async buscaProvaMarcacoes(filtros: FilterProvaMarcacaoDto) {
    const condicoes: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    if (filtros.codigoAnoLetivo) {
      condicoes.push(`FK2_USERS.ANO_LECTIVO_ID = :${paramIndex++}`);
      params.push(filtros.codigoAnoLetivo);
    }


    if (filtros.codigoGrau) {
      condicoes.push(`FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = :${paramIndex++}`);
      params.push(filtros.codigoGrau);
    }

    if (filtros.codigoCurso) {
      condicoes.push(`FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = :${paramIndex++}`);
      params.push(filtros.codigoCurso);
    }

    if (filtros.codigoTurno) {
      condicoes.push(`FK2_TB_PREINSCRICAO.CODIGO_TURNO = :${paramIndex++}`);
      params.push(filtros.codigoTurno);
    }

    if (filtros.filtroProva === 'com_prova' && filtros.statusProva !== undefined) {
      condicoes.push(`FK2_CANDIDATO_PROVAS.STATUS_ = :${paramIndex++}`);
      params.push(filtros.statusProva);
    }

    const where = condicoes.map((c) => `AND ${c}`).join('\n');

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;
    const offset = (page - 1) * limit;

    const offsetIndex = paramIndex++;
    const limitIndex = paramIndex++;
    params.push(offset, limit);

    const sqlBase =
      filtros.filtroProva === 'com_prova'
        ? `
        FROM FK2_TB_PREINSCRICAO
           , FK2_TB_TIPO_CANDIDATURA
           , FK2_USERS
           , FK2_TB_ANO_LECTIVO
           , FK2_TB_CURSOS
           , FK2_TB_PERIODOS
           , FK2_CANDIDATO_PROVAS
           , FK2_TB_HORARIO_PROVA
       WHERE FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = FK2_TB_TIPO_CANDIDATURA.ID
         AND FK2_TB_PREINSCRICAO.USER_ID                 = FK2_USERS.ID
         AND FK2_USERS.ANO_LECTIVO_ID                    = FK2_TB_ANO_LECTIVO.CODIGO
         AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA       = FK2_TB_CURSOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO_TURNO            = FK2_TB_PERIODOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO                  = FK2_CANDIDATO_PROVAS.CANDIDATO_ID
         AND FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID       = FK2_TB_HORARIO_PROVA.ID
         ${where}
      `
        : `
        FROM FK2_TB_PREINSCRICAO
           , FK2_TB_TIPO_CANDIDATURA
           , FK2_USERS
           , FK2_TB_ANO_LECTIVO
           , FK2_TB_CURSOS
           , FK2_TB_PERIODOS
       WHERE FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = FK2_TB_TIPO_CANDIDATURA.ID
         AND FK2_TB_PREINSCRICAO.USER_ID                 = FK2_USERS.ID
         AND FK2_USERS.ANO_LECTIVO_ID                    = FK2_TB_ANO_LECTIVO.CODIGO
         AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA       = FK2_TB_CURSOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO_TURNO            = FK2_TB_PERIODOS.CODIGO
         AND FK2_TB_PREINSCRICAO.CODIGO NOT IN (
               SELECT CANDIDATO_ID FROM FK2_CANDIDATO_PROVAS
         )
         ${where}
      `;

    const selectProva =
      filtros.filtroProva === 'com_prova'
        ? `
         , FK2_CANDIDATO_PROVAS.CANDIDATO_ID AS CANDIDATO_PROVA_CODIGO
         , SUBSTR(TO_CHAR(NUMTODSINTERVAL(
             TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)) / 86400000000000,
             'DAY'
           )), 12, 5) AS HORA_INICIO
         , SUBSTR(TO_CHAR(NUMTODSINTERVAL(
             TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_FIM, 4000, 1)) / 86400000000000,
             'DAY'
           )), 12, 5) AS HORA_FIM
         , FK2_CANDIDATO_PROVAS.STATUS_ AS STATUS_PROVA
         `
        : `
         , NULL AS CANDIDATO_PROVA_CODIGO
         , NULL AS DATA_REALIZACAO
         , NULL AS HORA_INICIO
         , NULL AS HORA_FIM
         , NULL AS STATUS_PROVA
      `;

    const sql = `
    SELECT FK2_TB_PREINSCRICAO.CODIGO
         , FK2_TB_PREINSCRICAO.NOME_COMPLETO AS NOME
         , FK2_TB_PREINSCRICAO.CONTACTOS_TELEFONICOS AS CONTATO
         , FK2_TB_PREINSCRICAO.SEXO
         , TO_CHAR(
            TO_DATE(
              DBMS_LOB.SUBSTR(FK2_TB_PREINSCRICAO.DATA_PREESCRINCAO, 4000, 1),
              'YYYY-MM-DD HH24:MI:SS'
            ),
            'DD/MM/YYYY'
          ) AS DATA_CANDIDATURA
         , FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA
         , FK2_TB_TIPO_CANDIDATURA.DESIGNACAO AS TIPO_CANDIDATURA
         , FK2_TB_PREINSCRICAO.ESTADO_PREISCRICAO_CANDIDATO AS ESTADO
         , FK2_TB_PREINSCRICAO.USER_ID
         , FK2_TB_ANO_LECTIVO.CODIGO AS CODIGO_ANO_LECTIVO
         , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
         , FK2_TB_ANO_LECTIVO.ESTADO AS ESTADO_ANO_LECTIVO
         , FK2_TB_CURSOS.CODIGO AS CODIGO_CURSO
         , FK2_TB_CURSOS.DESIGNACAO AS CURSO
         , FK2_TB_PREINSCRICAO.CODIGO_TURNO AS CODIGO_PERIODO
         , FK2_TB_PERIODOS.DESIGNACAO AS PERIODO
         ${selectProva}
    ${sqlBase}
    OFFSET :${offsetIndex} ROWS
    FETCH NEXT :${limitIndex} ROWS ONLY
  `;

    const sqlCount = `SELECT COUNT(*) AS TOTAL ${sqlBase}`;

    const [data, total] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params.slice(0, -2)),
    ]);

    return this.toLower({
      data,
      total: Number(total[0].TOTAL),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
    });
  }

  async atribuirProva(codigoCandidato: number) {
    return await this.dataSource.transaction(async (manager) => {
      // VALIDAR
      // SELECT p FROM TbPagamentos p where p.codigoPreInscricao.codigo=:codigoPreinscricao and  p.codigoFactura.codigoDescricao.id=9 and p.estado=1 and p.codigoFactura.estado=1

      const sqlCandidate = `
        SELECT FK2_TB_PREINSCRICAO.CODIGO
             , FK2_USERS.ANO_LECTIVO_ID
             , FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA
             , FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA
             , FK2_TB_PREINSCRICAO.CODIGO_TURNO
          FROM FK2_TB_PREINSCRICAO
             , FK2_TB_TIPO_CANDIDATURA
             , FK2_USERS
             , FK2_TB_ANO_LECTIVO
             , FK2_TB_CURSOS
             , FK2_TB_PERIODOS
         WHERE FK2_TB_PREINSCRICAO.CODIGO_TIPO_CANDIDATURA = FK2_TB_TIPO_CANDIDATURA.ID
           AND FK2_TB_PREINSCRICAO.USER_ID                 = FK2_USERS.ID
           AND FK2_USERS.ANO_LECTIVO_ID                    = FK2_TB_ANO_LECTIVO.CODIGO
           AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA       = FK2_TB_CURSOS.CODIGO
           AND FK2_TB_PREINSCRICAO.CODIGO_TURNO            = FK2_TB_PERIODOS.CODIGO
           AND FK2_TB_PREINSCRICAO.CODIGO             NOT IN (SELECT CANDIDATO_ID FROM FK2_CANDIDATO_PROVAS)
           AND FK2_TB_PREINSCRICAO.CODIGO = :1
      `;

      const candidates = await manager.query(sqlCandidate, [codigoCandidato]);
      if (candidates.length === 0) {
        throw new HttpException(
          'Candidato não encontrado ou já possui prova atribuída.',
          HttpStatus.NOT_FOUND,
        );
      }

      const candidate = candidates[0];

      const sqlExams = `
        SELECT FK2_PROVAS.ID
          FROM FK2_PROVAS
         WHERE JSON_EXISTS(cursos, '$[*]?(@ == $curso)' PASSING :1 AS "curso")
           AND FK2_PROVAS.ANO_LECTIVO_ID = :2
      `;
      const exams = await manager.query(sqlExams, [
        String(candidate.CURSO_CANDIDATURA),
        candidate.ANO_LECTIVO_ID,
      ]);
      if (exams.length === 0) {
        throw new HttpException(
          'Nenhuma prova encontrada para o curso e ano lectivo do candidato.',
          HttpStatus.NOT_FOUND,
        );
      }

      const randomExam = exams[Math.floor(Math.random() * exams.length)];

      const sqlSchedules = `
        SELECT FK2_TB_HORARIO_PROVA.ID
             , DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1) AS HORA_INICIO
             , DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_FIM, 4000, 1) AS HORA_FIM
             , FK2_TB_HORARIO_PROVA.DATA_REALIZACAO
             , FK2_TB_HORARIO_PROVA.SALA_ID
             , FK2_TB_HORARIO_PROVA.CURSO_ID
             , FK2_TB_SALAS.CAPACIDADEEXAMEACESSOPROVA
          FROM FK2_TB_HORARIO_PROVA
             , FK2_TB_SALAS
         WHERE FK2_TB_HORARIO_PROVA.SALA_ID            =  FK2_TB_SALAS.CODIGO
           AND FK2_TB_SALAS.CAPACIDADEEXAMEACESSOPROVA > 0
           --AND FK2_TB_HORARIO_PROVA.DATA_REALIZACAO    > TRUNC(SYSDATE) -- DESCOMENTAR PARA PRD
           AND FK2_TB_HORARIO_PROVA.PERIODO_ID         = :1
           AND FK2_TB_HORARIO_PROVA.CURSO_ID           = :2
         ORDER BY FK2_TB_HORARIO_PROVA.DATA_REALIZACAO
                , TO_NUMBER(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1))
      `;

      const schedules = (await manager.query(sqlSchedules, [
        candidate.CODIGO_TURNO,
        candidate.CURSO_CANDIDATURA,
      ])) as any[];

      let selectedSchedule: any = null;
      for (const schedule of schedules) {
        const sqlCount = `
          SELECT COUNT(*) AS QUANTIDADE_CANDIDATOS
            FROM FK2_CANDIDATO_PROVAS 
           WHERE FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID = :1
        `;
        const countRes = await manager.query(sqlCount, [schedule.ID]);
        const currentCount = Number(countRes[0].QUANTIDADE_CANDIDATOS);

        if (schedule.CAPACIDADEEXAMEACESSOPROVA > currentCount) {
          selectedSchedule = schedule;
          break;
        }
      }

      if (!selectedSchedule) {
        throw new HttpException(
          'Não há horários disponíveis com capacidade para este candidato.',
          HttpStatus.CONFLICT,
        );
      }

      const sqlInsertExame = `
        INSERT INTO FK2_TB_EXAME_ADMISSAO (CANAL, HORA_INICIO, HORA_FIM, DATA_PROVA, CODIGO_SALA, CODIGO_DISCIPLINA, CODIGO_PREINSCRICAO) 
        VALUES (1, :1, :2, :3, :4, :5, :6)
      `;
      await manager.query(sqlInsertExame, [
        selectedSchedule.HORA_INICIO,
        selectedSchedule.HORA_FIM,
        selectedSchedule.DATA_REALIZACAO,
        selectedSchedule.SALA_ID,
        randomExam.ID,
        codigoCandidato,
      ]);

      const sqlInsertCandidatoProva = `
        INSERT INTO FK2_CANDIDATO_PROVAS (CANDIDATO_ID, STATUS_, CANAL, HORARIO_PROVA_ID, PROVA_ID, CREATED_AT) 
        VALUES (:1, 0, 1, :2, :3, SYSDATE)
      `;
      await manager.query(sqlInsertCandidatoProva, [
        codigoCandidato,
        selectedSchedule.ID,
        randomExam.ID,
      ]);

      return {
        message: 'Prova atribuída com sucesso.',
        candidatoId: codigoCandidato,
      };
    });
  }

  async admitirCandidatoAoPublico(codigoCandidato: number, nota: number) {
    return await this.dataSource.transaction(async (manager) => {
      const sqlCheck = `
        SELECT FK2_TB_PREINSCRICAO.CODIGO
             , FK2_TB_PREINSCRICAO.NOME_COMPLETO
             , FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA
             , FK2_TB_PREINSCRICAO.CONTACTOS_TELEFONICOS AS CONTATO
             , (SELECT 1 FROM FK2_TB_ADMISSAO WHERE FK2_TB_ADMISSAO.PRE_INCRICAO = FK2_TB_PREINSCRICAO.CODIGO AND ROWNUM = 1) AS ADMISSAO
          FROM FK2_TB_PREINSCRICAO
         WHERE FK2_TB_PREINSCRICAO.CODIGO = :1
      `;
      const candidates = await manager.query(sqlCheck, [codigoCandidato]);
      if (candidates.length === 0) {
        throw new HttpException(
          'Candidato não encontrado.',
          HttpStatus.NOT_FOUND,
        );
      }

      const candidate = candidates[0];

      if (candidate.ADMISSAO) {
        throw new HttpException(
          'Candidato já possui admissão.',
          HttpStatus.CONFLICT,
        );
      }

      if (nota === null || Number(nota) < 10) {
        throw new HttpException(
          `Candidato não possui nota suficiente (${nota ?? 0}).`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const sqlInsertAdmissao = `
        INSERT INTO FK2_TB_ADMISSAO (PRE_INCRICAO, MEDIAFINAL, DATA, RESULTADO, CANAL, POLO_ID) 
        VALUES (:candidatoId, :nota, SYSDATE, 'Admitido(a)', 1, 1)
        RETURNING CODIGO INTO :outId
      `;

      const resAdmissao = await manager.query(sqlInsertAdmissao, {
        candidatoId: codigoCandidato,
        nota: nota,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any);

      const codigoAdmissao = resAdmissao.outId[0];

      const sqlInsertHistorico = `
        INSERT INTO FK2_TB_ADMISSAO_HISTORICO (FK_ADMISSAO, LOCAL_EXAME, CREATED_BY, CREATED_AT) 
        VALUES (:1, 'Universidade Pública', 1, SYSDATE)
      `;
      await manager.query(sqlInsertHistorico, [codigoAdmissao]);

      return {
        message: 'Candidato admitido com sucesso.',
        codigoAdmissao,
      };
    });
  }

  async lancarNotaArquitectura(codigoCandidato: number, notaPratica: number) {
    return await this.dataSource.transaction(async (manager) => {
      const sqlFetch = `
        SELECT FK2_TB_PREINSCRICAO.CODIGO
             , FK2_CANDIDATO_PROVAS.NOTA AS NOTA_TEORICA
             , FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA
          FROM FK2_CANDIDATO_PROVAS
             , FK2_TB_PREINSCRICAO
             , FK2_TB_HORARIO_PROVA
         WHERE FK2_CANDIDATO_PROVAS.CANDIDATO_ID = FK2_TB_PREINSCRICAO.CODIGO
           AND FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID = FK2_TB_HORARIO_PROVA.ID
           AND FK2_TB_PREINSCRICAO.CODIGO = :1
           AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = 7
      `;
      const rows = await manager.query(sqlFetch, [codigoCandidato]);
      if (rows.length === 0) {
        throw new HttpException(
          'Candidato de Arquitectura não encontrado ou sem prova atribuída.',
          HttpStatus.NOT_FOUND,
        );
      }

      const { NOTA_TEORICA } = rows[0];
      const media = Number(NOTA_TEORICA) * 0.3 + Number(notaPratica);

      const sqlUpdateGrade = `
        UPDATE FK2_CANDIDATO_PROVAS
           SET NOTA = :1
         WHERE CANDIDATO_ID = :2
      `;
      await manager.query(sqlUpdateGrade, [media, codigoCandidato]);

      if (media >= 10) {
        const sqlInsertAdmissao = `
          INSERT INTO FK2_TB_ADMISSAO (PRE_INCRICAO, MEDIAFINAL, DATA, RESULTADO, CANAL, POLO_ID) 
          VALUES (:candidatoId, :nota, SYSDATE, 'Admitido(a)', 1, 1)
          RETURNING CODIGO INTO :outId
        `;

        const resAdmissao = await manager.query(sqlInsertAdmissao, {
          candidatoId: codigoCandidato,
          nota: media,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any);

        const codigoAdmissao = resAdmissao.outId[0];

        const sqlInsertHistorico = `
          INSERT INTO FK2_TB_ADMISSAO_HISTORICO (FK_ADMISSAO, LOCAL_EXAME, CREATED_BY, CREATED_AT) 
          VALUES (:1, 'Universidade Metódista de Angola', 1, SYSDATE)
        `;
        await manager.query(sqlInsertHistorico, [codigoAdmissao]);

        return {
          message: 'Nota lançada e candidato admitido com sucesso.',
          media,
          codigoAdmissao,
        };
      }

      return {
        message:
          'Nota lançada com sucesso (candidato não atingiu média para admissão).',
        media,
      };
    });
  }

  async buscaListaCandidatosProvas(filtros: FilterCandidatoDto) {
    const {
      codigoAnoLetivo,
      codigoFaculdade,
      codigoCurso,
      codigoTurno,
      search,
      page = 1,
      limit = 10,
    } = filtros;

    const offset = (page - 1) * limit;

    let sql = `
      SELECT FK2_TB_PREINSCRICAO.CODIGO AS NUMERO_INSCRICAO
           , FK2_TB_PREINSCRICAO.NOME_COMPLETO AS NOME
           , FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID AS CODIGO_ANO_LECTIVO
           , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
           , FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA AS CODIGO_CURSO
           , FK2_TB_CURSOS.DESIGNACAO AS CURSO
           , FK2_TB_HORARIO_PROVA.PERIODO_ID AS CODIGO_PERIODO
           , FK2_TB_PERIODOS.DESIGNACAO AS PERIODO
           , FK2_TB_CURSOS.FACULDADE_ID AS CODIGO_FACULDADE 
           , FK2_TB_FACULDADE.DESIGNACAO AS FACULDADE
           , FK2_PROVAS.DESCRICAO AS LISTA_DE_PROVAS
        FROM FK2_TB_PREINSCRICAO
           , FK2_TB_HORARIO_PROVA
           , FK2_TB_ANO_LECTIVO
           , FK2_TB_CURSOS
           , FK2_TB_PERIODOS
           , FK2_TB_FACULDADE
           , FK2_CANDIDATO_PROVAS
           , FK2_PROVAS
       WHERE FK2_TB_PREINSCRICAO.CODIGO            = FK2_CANDIDATO_PROVAS.CANDIDATO_ID
         AND FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID = FK2_TB_HORARIO_PROVA.ID
         AND FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID   = FK2_TB_ANO_LECTIVO.CODIGO
         AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = FK2_TB_CURSOS.CODIGO
         AND FK2_TB_HORARIO_PROVA.PERIODO_ID       = FK2_TB_PERIODOS.CODIGO
         AND FK2_TB_CURSOS.FACULDADE_ID            = FK2_TB_FACULDADE.CODIGO
         AND FK2_CANDIDATO_PROVAS.PROVA_ID         = FK2_PROVAS.ID
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (codigoAnoLetivo) {
      sql += ` AND FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = :${paramIndex++}`;
      params.push(codigoAnoLetivo);
    }

    if (codigoFaculdade) {
      sql += ` AND FK2_TB_CURSOS.FACULDADE_ID = :${paramIndex++}`;
      params.push(codigoFaculdade);
    }

    if (codigoCurso) {
      sql += ` AND FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = :${paramIndex++}`;
      params.push(codigoCurso);
    }

    if (codigoTurno) {
      sql += ` AND FK2_TB_HORARIO_PROVA.PERIODO_ID = :${paramIndex++}`;
      params.push(codigoTurno);
    }

    if (search) {
      sql += ` AND (UPPER(FK2_TB_PREINSCRICAO.NOME_COMPLETO) LIKE UPPER(:${paramIndex++}) OR FK2_TB_PREINSCRICAO.CODIGO = :${paramIndex++})`;
      params.push(`%${search}%`);
      params.push(isNaN(Number(search)) ? -1 : Number(search));
    }

    const sqlCount = `SELECT COUNT(*) AS TOTAL FROM (${sql})`;
    const totalResult = await this.dataSource.query(sqlCount, params);
    const total = totalResult[0].TOTAL;

    sql += ` OFFSET :${paramIndex++} ROWS FETCH NEXT :${paramIndex++} ROWS ONLY`;
    params.push(offset);
    params.push(limit);

    const rows = await this.dataSource.query(sql, params);

    const data = rows.map((row: any) => {
      const listaProvas = row.LISTA_DE_PROVAS
        ? row.LISTA_DE_PROVAS.replace(/^Prova de\\s*/i, '')
          .split(/<br>/i)[0]
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
        : [];

      return {
        ...this.toLower(row),
        lista_de_provas: listaProvas,
      };
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async resetarProva(codigoCandidato: number) {
    const sql = `
      UPDATE FK2_CANDIDATO_PROVAS
         SET STATUS_     = 0
           , NOTA        = 0
           , TEMPO       = NULL
           , PROVAFEITA  = NULL  
       WHERE CANDIDATO_ID = :1
    `;
    const result = await this.dataSource.query(sql, [codigoCandidato]);

    return {
      message: 'Prova resetada com sucesso.',
      candidatoId: codigoCandidato,
    };
  }

  private toLower(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.toLower(item));
    }
    if (data !== null && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key.toLowerCase(),
          this.toLower(value),
        ]),
      );
    }
    return data;
  }
}
