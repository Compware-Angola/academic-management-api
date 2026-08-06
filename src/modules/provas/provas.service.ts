import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterProvaDto } from './dto/filter-prova.dto';
import { CreateProvaDto } from './dto/create-prova.dto';
import { UpdateProvaDto } from './dto/update-prova.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { gerarHashExterno } from '../util/hash.util';
import OracleDB, { CURSOR } from 'oracledb';

@Injectable()
export class ProvasService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filtros: FilterProvaDto) {
    const {
      id,
      userId,
      anoLetivoId,
      dataRealizacao,
      descricao,
      page = 1,
      limit = 10,
    } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT TO_CHAR(TRUNC(P.DATA_REALIZACAO), 'YYYY-MM-DD') AS DATA_REALIZACAO,
             P.SENHA_PROVA,
             P.SALA_ID,
             P.TIPO_PROVA_ID,
             P.DISCIPLINA_ID,
             P.ANO_LECTIVO_ID,
             A.DESIGNACAO AS ANO_LETIVO,
             P.USER_ID,
             U.NOME AS USUARIO,
             P.CREATED_AT,
             P.UPDATED_AT,
             P.STATUS_,
             P.DURACAO,
             P.PERIODO_ID,
             P.TEXTO,
             P.DESCRICAO,
             P.PERGUNTAS,
             P.DISCIPLINAS,
             P.CURSOS,
             P.HORA_INICIO AS inicio,
             P.ID
      FROM FK2_PROVAS P
      JOIN FK2_MCA_TB_UTILIZADOR U ON P.USER_ID = U.PK_UTILIZADOR
      JOIN FK2_TB_ANO_LECTIVO A ON P.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (id) {
      query += ` AND P.ID = :${paramIndex}`;
      parameters.push(id);
      paramIndex++;
    }

    if (userId) {
      query += ` AND P.USER_ID = :${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }

    if (anoLetivoId) {
      query += ` AND P.ANO_LECTIVO_ID = :${paramIndex}`;
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (dataRealizacao) {
      query += ` AND TRUNC(P.DATA_REALIZACAO) = TO_DATE(:${paramIndex}, 'YYYY-MM-DD')`;
      parameters.push(dataRealizacao);
      paramIndex++;
    }

    if (descricao) {
      query += ` AND UPPER(P.DESCRICAO) LIKE :${paramIndex}`;
      parameters.push(`%${descricao.toUpperCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY P.CREATED_AT DESC`;

    let countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_PROVAS P
      JOIN FK2_MCA_TB_UTILIZADOR U ON P.USER_ID = U.PK_UTILIZADOR
      JOIN FK2_TB_ANO_LECTIVO A ON P.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
    `;

    const countParameters: any[] = [];
    let countParamIndex = 1;

    if (id) {
      countQuery += ` AND P.ID = :${countParamIndex}`;
      countParameters.push(id);
      countParamIndex++;
    }

    if (userId) {
      countQuery += ` AND P.USER_ID = :${countParamIndex}`;
      countParameters.push(userId);
      countParamIndex++;
    }

    if (anoLetivoId) {
      countQuery += ` AND P.ANO_LECTIVO_ID = :${countParamIndex}`;
      countParameters.push(anoLetivoId);
      countParamIndex++;
    }

    if (dataRealizacao) {
      countQuery += ` AND TRUNC(P.DATA_REALIZACAO) = TO_DATE(:${countParamIndex}, 'YYYY-MM-DD')`;
      countParameters.push(dataRealizacao);
      countParamIndex++;
    }

    if (descricao) {
      countQuery += ` AND UPPER(P.DESCRICAO) LIKE :${countParamIndex}`;
      countParameters.push(`%${descricao.toUpperCase()}%`);
      countParamIndex++;
    }

    const countResult = await this.dataSource.query(
      countQuery,
      countParameters,
    );
    const total = parseInt(countResult[0]?.TOTAL || '0', 10);

    query += ` OFFSET :${paramIndex} ROWS FETCH NEXT :${paramIndex + 1} ROWS ONLY`;
    parameters.push(offset, limit);

    const result = await this.dataSource.query(query, parameters);

    const dataFormatted = result.map((prova) => {
      const formatted = { ...prova };

      if (formatted.PERGUNTAS) {
        try {
          formatted.PERGUNTAS = JSON.parse(formatted.PERGUNTAS);
        } catch {
          if (typeof formatted.PERGUNTAS === 'string') {
            formatted.PERGUNTAS = formatted.PERGUNTAS.split(',').map((id) => ({
              id: parseInt(id.trim()),
            }));
          }
        }
      }

      if (formatted.CURSOS) {
        try {
          formatted.CURSOS = JSON.parse(formatted.CURSOS);
        } catch {
          if (typeof formatted.CURSOS === 'string') {
            formatted.CURSOS = formatted.CURSOS.split(',').map((id) => ({
              id: parseInt(id.trim()),
            }));
          }
        }
      }

      if (formatted.DISCIPLINAS) {
        try {
          formatted.DISCIPLINAS = JSON.parse(formatted.DISCIPLINAS);
        } catch {
          if (typeof formatted.DISCIPLINAS === 'string') {
            formatted.DISCIPLINAS = formatted.DISCIPLINAS.split(',').map(
              (id) => ({ id: parseInt(id.trim()) }),
            );
          }
        }
      }

      return formatted;
    });

    return {
      data: toLowerCaseKeys(dataFormatted),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const provaQuery = `
     SELECT TO_CHAR(TRUNC(P.DATA_REALIZACAO), 'YYYY-MM-DD') AS DATA_REALIZACAO,
             P.SENHA_PROVA,
             P.SALA_ID,
             P.TIPO_PROVA_ID,
             P.DISCIPLINA_ID,
             P.ANO_LECTIVO_ID,
             A.DESIGNACAO AS ANO_LETIVO,
             P.USER_ID,
             U.NOME AS USUARIO,
             P.CREATED_AT,
             P.UPDATED_AT,
             P.STATUS_,
             P.DURACAO,
             P.PERIODO_ID,
             P.TEXTO,
             P.DESCRICAO,
             P.PERGUNTAS,
             P.DISCIPLINAS,
             P.CURSOS,
             P.HORA_INICIO AS inicio,
             P.ID
      FROM FK2_PROVAS P
      JOIN FK2_MCA_TB_UTILIZADOR U ON P.USER_ID = U.PK_UTILIZADOR
      JOIN FK2_TB_ANO_LECTIVO A ON P.ANO_LECTIVO_ID = A.CODIGO
      WHERE P.ID = :1
    `;

    const provaResult = await this.dataSource.query(provaQuery, [id]);

    if (!provaResult || provaResult.length === 0) {
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
    }

    const prova = provaResult[0];

    let perguntasIds: number[] = [];
    try {
      const parsed = JSON.parse(prova.PERGUNTAS);
      perguntasIds = Array.isArray(parsed)
        ? parsed.map((p: any) => (typeof p === 'object' ? p.id : p))
        : [];
    } catch {
      if (typeof prova.PERGUNTAS === 'string') {
        perguntasIds = prova.PERGUNTAS.split(',').map((id) =>
          parseInt(id.trim()),
        );
      }
    }

    let perguntasDetalhadas: any[] = [];
    if (perguntasIds.length > 0) {
      const placeholders = perguntasIds.map((_, i) => `:${i + 1}`).join(',');
      const perguntasQuery = `
        SELECT P.ID,
               P.DESCRICAO AS PERGUNTA_TEXTO,
               P.TIPO_PERGUNTA_ID,
               TP.DESIGNACAO AS TIPO_PERGUNTA,
               P.DISCIPLINA_ID,
               D.DESIGNACAO AS DISCIPLINA,
               P.CREATED_AT AS PERGUNTA_CREATED_AT,
               P.UPDATED_AT AS PERGUNTA_UPDATED_AT
        FROM FK2_PERGUNTAS P
        LEFT JOIN FK2_TB_TIPO_PERGUNTA TP ON P.TIPO_PERGUNTA_ID = TP.CODIGO
        LEFT JOIN FK2_DISCIPLINA_ADMISSAO D ON P.DISCIPLINA_ID = D.ID
        WHERE P.ID IN (${placeholders})
          AND P.DELETED_AT IS NULL
        ORDER BY P.ID
      `;

      const perguntas = await this.dataSource.query(
        perguntasQuery,
        perguntasIds,
      );

      for (const pergunta of perguntas) {
        const respostasQuery = `
          SELECT R.ID,
                 R.DESCRICAO AS RESPOSTA_TEXTO,
                 R.TIPO_RESPOSTA_ID,
                 TR.DESIGNCAO AS TIPO_RESPOSTA,
                 R.CREATED_AT AS RESPOSTA_CREATED_AT,
                 R.UPDATED_AT AS RESPOSTA_UPDATED_AT
          FROM FK2_RESPOSTAS R
          LEFT JOIN FK2_TB_TIPO_RESPOSTA TR ON R.TIPO_RESPOSTA_ID = TR.CODIGO
          WHERE R.PERGUNTA_ID = :1
          ORDER BY R.ID
        `;

        const respostas = await this.dataSource.query(respostasQuery, [
          pergunta.ID,
        ]);

        perguntasDetalhadas.push({
          ...toLowerCaseKeys(pergunta),
          respostas: toLowerCaseKeys(respostas),
        });
      }
    }
    let cursosIds: number[] = [];
    try {
      const parsed = JSON.parse(prova.CURSOS);
      cursosIds = Array.isArray(parsed)
        ? parsed.map((c: any) => (typeof c === 'object' ? c.id : c))
        : [];
    } catch {
      if (typeof prova.CURSOS === 'string') {
        cursosIds = prova.CURSOS.split(',').map((id) => parseInt(id.trim()));
      }
    }

    let cursosDetalhados: any[] = [];
    if (cursosIds.length > 0) {
      const cursosPlaceholders = cursosIds.map((_, i) => `:${i + 1}`).join(',');
      const cursosQuery = `
        SELECT CODIGO,
               DESIGNACAO
        FROM FK2_TB_CURSOS
        WHERE CODIGO IN (${cursosPlaceholders})
        ORDER BY CODIGO
      `;

      const cursos = await this.dataSource.query(cursosQuery, cursosIds);
      cursosDetalhados = toLowerCaseKeys(cursos);
    }

    let disciplinasIds: number[] = [];
    try {
      const parsed = JSON.parse(prova.DISCIPLINAS);
      disciplinasIds = Array.isArray(parsed)
        ? parsed.map((d: any) => (typeof d === 'object' ? d.id : d))
        : [];
    } catch {
      if (typeof prova.DISCIPLINAS === 'string') {
        disciplinasIds = prova.DISCIPLINAS.split(',').map((id) =>
          parseInt(id.trim()),
        );
      }
    }

    let disciplinasDetalhadas: any[] = [];
    if (disciplinasIds.length > 0) {
      const disciplinasPlaceholders = disciplinasIds
        .map((_, i) => `:${i + 1}`)
        .join(',');
      const disciplinasQuery = `
        SELECT ID,
               DESIGNACAO
        FROM FK2_DISCIPLINA_ADMISSAO
        WHERE ID IN (${disciplinasPlaceholders})
        ORDER BY ID
      `;

      const disciplinas = await this.dataSource.query(
        disciplinasQuery,
        disciplinasIds,
      );
      disciplinasDetalhadas = toLowerCaseKeys(disciplinas);
    }

    return {
      ...toLowerCaseKeys(prova),
      perguntas: perguntasDetalhadas,
      cursos: cursosDetalhados,
      disciplinas: disciplinasDetalhadas,
    };
  }

  async create(createProvaDto: CreateProvaDto) {
    let { senhaProva } = createProvaDto;
    let fim: string | undefined;
    const {
      descricao,
      anoLetivoId,
      userId,
      duracao,
      texto,
      perguntas,
      disciplinas,
      cursos,
      data,
      inicio,
      local,
      periodo_id = 5,
    } = createProvaDto;

    if (inicio !== undefined || duracao !== undefined) {
      const inicioEfetivo = inicio;
      const duracaoEfetiva = duracao;

      if (inicioEfetivo && duracaoEfetiva) {
        const [h, m] = String(inicioEfetivo).split(':').map(Number);
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
          const base = new Date(1970, 0, 1, h, m);
          base.setMinutes(base.getMinutes() + Number(duracaoEfetiva));
          fim = `${String(base.getHours()).padStart(2, '0')}:${String(
            base.getMinutes(),
          ).padStart(2, '0')}`;
        }
      }
    }
    const anoLetivoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
      [anoLetivoId],
    );

    if (!anoLetivoExists || anoLetivoExists.length === 0) {
      throw new BadRequestException(
        `Ano letivo com ID ${anoLetivoId} não encontrado`,
      );
    }

    const userExists = await this.dataSource.query(
      `SELECT PK_UTILIZADOR FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = :1`,
      [userId],
    );

    if (!userExists || userExists.length === 0) {
      throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
    }

    const senhaHash = await gerarHashExterno(senhaProva);

    const insertProvaQuery = `
    INSERT INTO FK2_PROVAS (
      DESCRICAO,
      SENHA_PROVA,
      ANO_LECTIVO_ID,
      USER_ID,
      DURACAO,
      TEXTO,
      PERGUNTAS,
      DISCIPLINAS,
      CURSOS,
      DATA_REALIZACAO,
      HORA_INICIO,
      HORA_FIM,
      SALA_ID,
      PERIODO_ID,
      STATUS_,
      CREATED_AT
    ) VALUES (
      :1, :2, :3, :4, :5, :6, :7, :8, :9,
      TO_DATE(:10, 'YYYY-MM-DD'), :11, :12, :13, :14, 1, SYSDATE
    )
    RETURNING ID INTO :provaId
  `;

    const provaResult = await this.dataSource.query(insertProvaQuery, [
      descricao,
      senhaHash,
      anoLetivoId,
      userId,
      duracao,
      texto || null,
      perguntas ? JSON.stringify(perguntas) : null,
      disciplinas ? JSON.stringify(disciplinas) : null,
      cursos ? JSON.stringify(cursos) : null,
      data,
      inicio,
      fim,
      local,
      periodo_id,
      { dir: OracleDB.BIND_OUT, type: OracleDB.NUMBER },
    ]);

    // formato do retorno depende da versão do driver TypeORM/oracledb —
    // confirma com console.log(provaResult) se vier em outBinds ou raw
    const provaId = provaResult?.outBinds
      ? provaResult.outBinds[0]
      : provaResult[0]?.[0];

    await this.dataSource.query(
      `
      INSERT INTO FK2_TB_HORARIO_PROVA (
        PROVA_ID,
        DATA_REALIZACAO,
        HORA_INICIO,
        HORA_FIM,
        USER_ID,
        ANO_LECTIVO_ID,
        SALA_ID,
        PERIODO_ID,
        CREATED_AT
      ) VALUES (
        :1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8, SYSDATE
      )
    `,
      [provaId, data, inicio, fim, userId, anoLetivoId, local, periodo_id],
    );

    return {
      message: 'Prova criada com sucesso',
    };
  }

  async update(id: number, updateProvaDto: UpdateProvaDto) {
    const {
      anoLetivoId,
      duracao,
      descricao,
      perguntas,
      cursos,
      disciplinas,
      data,
      inicio,
      local,
      periodo_id,
    } = updateProvaDto;
    let { senhaProva } = updateProvaDto;

    const provaExists = await this.dataSource.query(
      `SELECT ID, DURACAO, HORA_INICIO FROM FK2_PROVAS WHERE ID = :1`,
      [id],
    );

    if (!provaExists || provaExists.length === 0) {
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
    }

    if (anoLetivoId) {
      const anoLetivoExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
        [anoLetivoId],
      );

      if (!anoLetivoExists || anoLetivoExists.length === 0) {
        throw new BadRequestException(
          `Ano letivo com ID ${anoLetivoId} não encontrado`,
        );
      }
    }

    if (data) {
      const dataInformada = new Date(`${data}T00:00:00`);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (dataInformada < hoje) {
        throw new BadRequestException(
          'Não é possível marcar a prova para uma data anterior à atual',
        );
      }
    }

    // recalcula HORA_FIM sempre que inicio e/ou duracao mudarem,
    // usando o valor atual do banco para o campo que não veio no payload
    let fim: string | undefined;
    if (inicio !== undefined || duracao !== undefined) {
      const inicioEfetivo = inicio ?? provaExists[0].HORA_INICIO;
      const duracaoEfetiva = duracao ?? provaExists[0].DURACAO;

      if (inicioEfetivo && duracaoEfetiva) {
        const [h, m] = String(inicioEfetivo).split(':').map(Number);
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
          const base = new Date(1970, 0, 1, h, m);
          base.setMinutes(base.getMinutes() + Number(duracaoEfetiva));
          fim = `${String(base.getHours()).padStart(2, '0')}:${String(
            base.getMinutes(),
          ).padStart(2, '0')}`;
        }
      }
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (senhaProva !== undefined) {
      const senhaHash = await gerarHashExterno(senhaProva);
      updates.push(`SENHA_PROVA = :${paramIndex}`);
      parameters.push(senhaHash);
      paramIndex++;
    }

    if (anoLetivoId !== undefined) {
      updates.push(`ANO_LECTIVO_ID = :${paramIndex}`);
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (duracao !== undefined) {
      updates.push(`DURACAO = :${paramIndex}`);
      parameters.push(duracao);
      paramIndex++;
    }

    if (descricao !== undefined) {
      updates.push(`DESCRICAO = :${paramIndex}`);
      parameters.push(descricao);
      paramIndex++;
    }

    if (perguntas !== undefined) {
      updates.push(`PERGUNTAS = :${paramIndex}`);
      parameters.push(JSON.stringify(perguntas));
      paramIndex++;
    }

    if (cursos !== undefined) {
      updates.push(`CURSOS = :${paramIndex}`);
      parameters.push(JSON.stringify(cursos));
      paramIndex++;
    }

    if (disciplinas !== undefined) {
      updates.push(`DISCIPLINAS = :${paramIndex}`);
      parameters.push(JSON.stringify(disciplinas));
      paramIndex++;
    }

    if (data !== undefined) {
      updates.push(`DATA_REALIZACAO = TO_DATE(:${paramIndex}, 'YYYY-MM-DD')`);
      parameters.push(data);
      paramIndex++;
    }

    if (inicio !== undefined) {
      updates.push(`HORA_INICIO = :${paramIndex}`);
      parameters.push(inicio);
      paramIndex++;
    }

    if (fim !== undefined) {
      updates.push(`HORA_FIM = :${paramIndex}`);
      parameters.push(fim);
      paramIndex++;
    }
    if (local !== undefined) {
      updates.push(`SALA_ID = :${paramIndex}`);
      parameters.push(local);
      paramIndex++;
    }

    if (periodo_id !== undefined) {
      updates.push(`PERIODO_ID = :${paramIndex}`);
      parameters.push(periodo_id);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
    UPDATE FK2_PROVAS
    SET ${updates.join(', ')}
    WHERE ID = :${paramIndex}
  `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    // mantém FK2_TB_HORARIO_PROVA em sincronia quando algo relevante mudou
    if (
      data !== undefined ||
      inicio !== undefined ||
      fim !== undefined ||
      anoLetivoId !== undefined
    ) {
      const horarioUpdates: string[] = [];
      const horarioParams: any[] = [];
      let horarioIndex = 1;

      if (data !== undefined) {
        horarioUpdates.push(
          `DATA_REALIZACAO = TO_DATE(:${horarioIndex}, 'YYYY-MM-DD')`,
        );
        horarioParams.push(data);
        horarioIndex++;
      }

      if (local !== undefined) {
        horarioUpdates.push(`SALA_ID = :${local}`);
        horarioParams.push(local);
        horarioIndex++;
      }

      if (inicio !== undefined) {
        horarioUpdates.push(`HORA_INICIO = :${horarioIndex}`);
        horarioParams.push(inicio);
        horarioIndex++;
      }

      if (fim !== undefined) {
        horarioUpdates.push(`HORA_FIM = :${horarioIndex}`);
        horarioParams.push(fim);
        horarioIndex++;
      }

      if (periodo_id !== undefined) {
        horarioUpdates.push(`PERIODO_ID = :${horarioIndex}`);
        horarioParams.push(periodo_id);
        horarioIndex++;
      }

      if (anoLetivoId !== undefined) {
        horarioUpdates.push(`ANO_LECTIVO_ID = :${horarioIndex}`);
        horarioParams.push(anoLetivoId);
        horarioIndex++;
      }

      horarioUpdates.push(`UPDATED_AT = SYSDATE`);
      horarioParams.push(id);

      await this.dataSource.query(
        `
        UPDATE FK2_TB_HORARIO_PROVA
        SET ${horarioUpdates.join(', ')}
        WHERE PROVA_ID = :${horarioIndex}
      `,
        horarioParams,
      );
    }

    return {
      message: 'Prova atualizada com sucesso',
    };
  }

  async remove(id: number) {
    const provaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PROVAS WHERE ID = :1`,
      [id],
    );

    if (!provaExists || provaExists.length === 0) {
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
    }

    const query = `DELETE FROM FK2_PROVAS WHERE ID = :1`;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Prova removida com sucesso',
    };
  }
}
