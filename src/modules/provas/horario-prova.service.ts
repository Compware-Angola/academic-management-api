import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterHorarioProvaDto } from './dto/filter-horario-prova.dto';
import { CreateHorarioProvaDto } from './dto/create-horario-prova.dto';
import { UpdateHorarioProvaDto } from './dto/update-horario-prova.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class HorarioProvaService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filtros: FilterHorarioProvaDto) {
    const {
      provaId,
      salaId,
      poloId,
      userId,
      cursoId,
      periodoId,
      anoLetivoId,
      dataRealizacao,
      horaInicio,
      horaFim,
      page = 1,
      limit = 10,
    } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT HP.ID,
             HP.PROVA_ID,
             HP.DATA_REALIZACAO,
             SUBSTR(TO_CHAR(NUMTODSINTERVAL(
            TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_INICIO, 4000, 1)) / 86400000000000,
            'DAY'
            )), 12, 5) AS HORA_INICIO,
             SUBSTR(TO_CHAR(NUMTODSINTERVAL(
             TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_FIM, 4000, 1)) / 86400000000000,
             'DAY'
             )), 12, 5) AS HORA_FIM,
             HP.SALA_ID,
             HP.POLO_ID,
             HP.USER_ID,
             HP.CURSO_ID,
             HP.PERIODO_ID,
             HP.ANO_LECTIVO_ID,
             HP.CREATED_AT,
             HP.UPDATED_AT
      FROM FK2_TB_HORARIO_PROVA HP
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (provaId) {
      query += ` AND HP.PROVA_ID = :${paramIndex}`;
      parameters.push(provaId);
      paramIndex++;
    }

    if (salaId) {
      query += ` AND HP.SALA_ID = :${paramIndex}`;
      parameters.push(salaId);
      paramIndex++;
    }

    if (poloId) {
      query += ` AND HP.POLO_ID = :${paramIndex}`;
      parameters.push(poloId);
      paramIndex++;
    }

    if (userId) {
      query += ` AND HP.USER_ID = :${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }

    if (cursoId) {
      query += ` AND HP.CURSO_ID = :${paramIndex}`;
      parameters.push(cursoId);
      paramIndex++;
    }

    if (periodoId) {
      query += ` AND HP.PERIODO_ID = :${paramIndex}`;
      parameters.push(periodoId);
      paramIndex++;
    }

    if (anoLetivoId) {
      query += ` AND HP.ANO_LECTIVO_ID = :${paramIndex}`;
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (dataRealizacao) {
      query += ` AND TRUNC(HP.DATA_REALIZACAO) = TO_DATE(:${paramIndex}, 'YYYY-MM-DD')`;
      parameters.push(dataRealizacao);
      paramIndex++;
    }

    if (horaInicio) {
      const [hh, mm, ss = 0] = horaInicio.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      query += ` AND TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_INICIO, 4000, 1)) = :${paramIndex}`;
      parameters.push(nanos);
      paramIndex++;
    }

    if (horaFim) {
      const [hh, mm, ss = 0] = horaFim.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      query += ` AND TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_FIM, 4000, 1)) = :${paramIndex}`;
      parameters.push(nanos);
      paramIndex++;
    }

    query += ` ORDER BY HP.DATA_REALIZACAO DESC, TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_INICIO, 4000, 1)) DESC`;

    let countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_HORARIO_PROVA HP
      WHERE 1=1
    `;

    const countParameters: any[] = [];
    let countParamIndex = 1;

    if (provaId) {
      countQuery += ` AND HP.PROVA_ID = :${countParamIndex}`;
      countParameters.push(provaId);
      countParamIndex++;
    }

    if (salaId) {
      countQuery += ` AND HP.SALA_ID = :${countParamIndex}`;
      countParameters.push(salaId);
      countParamIndex++;
    }

    if (poloId) {
      countQuery += ` AND HP.POLO_ID = :${countParamIndex}`;
      countParameters.push(poloId);
      countParamIndex++;
    }

    if (userId) {
      countQuery += ` AND HP.USER_ID = :${countParamIndex}`;
      countParameters.push(userId);
      countParamIndex++;
    }

    if (cursoId) {
      countQuery += ` AND HP.CURSO_ID = :${countParamIndex}`;
      countParameters.push(cursoId);
      countParamIndex++;
    }

    if (periodoId) {
      countQuery += ` AND HP.PERIODO_ID = :${countParamIndex}`;
      countParameters.push(periodoId);
      countParamIndex++;
    }

    if (anoLetivoId) {
      countQuery += ` AND HP.ANO_LECTIVO_ID = :${countParamIndex}`;
      countParameters.push(anoLetivoId);
      countParamIndex++;
    }

    if (dataRealizacao) {
      countQuery += ` AND TRUNC(HP.DATA_REALIZACAO) = TO_DATE(:${countParamIndex}, 'YYYY-MM-DD')`;
      countParameters.push(dataRealizacao);
      countParamIndex++;
    }

    if (horaInicio) {
      const [hh, mm, ss = 0] = horaInicio.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      countQuery += ` AND TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_INICIO, 4000, 1)) = :${countParamIndex}`;
      countParameters.push(nanos);
      countParamIndex++;
    }

    if (horaFim) {
      const [hh, mm, ss = 0] = horaFim.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      countQuery += ` AND TO_NUMBER(DBMS_LOB.SUBSTR(HP.HORA_FIM, 4000, 1)) = :${countParamIndex}`;
      countParameters.push(nanos);
      countParamIndex++;
    }

    const [data, countResult] = await Promise.all([
      this.dataSource.query(
        query + ` OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        [...parameters, offset, limit],
      ),
      this.dataSource.query(countQuery, countParameters),
    ]);

    const total = countResult[0]?.TOTAL || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((item: any) => toLowerCaseKeys(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async create(createHorarioProvaDto: CreateHorarioProvaDto) {
    const {
      provaId,
      dataRealizacao,
      horaInicio,
      horaFim,
      salaId,
      poloId,
      userId,
      cursoId,
      periodoId,
      anoLetivoId,
    } = createHorarioProvaDto;

    const [hhInicio, mmInicio, ssInicio = 0] = horaInicio
      .split(':')
      .map(Number);
    const nanosInicio =
      hhInicio * 3600000000000 + mmInicio * 60000000000 + ssInicio * 1000000000;

    const [hhFim, mmFim, ssFim = 0] = horaFim.split(':').map(Number);
    const nanosFim =
      hhFim * 3600000000000 + mmFim * 60000000000 + ssFim * 1000000000;

    const query = `
      INSERT INTO FK2_TB_HORARIO_PROVA (
        PROVA_ID,
        DATA_REALIZACAO,
        HORA_INICIO,
        HORA_FIM,
        SALA_ID,
        POLO_ID,
        USER_ID,
        CURSO_ID,
        PERIODO_ID,
        ANO_LECTIVO_ID,
        CREATED_AT
      ) VALUES (
        :1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8, :9, :10, SYSDATE
      )
    `;

    try {
      await this.dataSource.query(query, [
        provaId,
        dataRealizacao,
        nanosInicio,
        nanosFim,
        salaId,
        poloId,
        userId,
        cursoId,
        periodoId,
        anoLetivoId,
      ]);

      return {
        message: 'Horário de prova criado com sucesso',
      };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao criar horário de prova: ' + error.message,
      );
    }
  }

  async update(id: number, updateHorarioProvaDto: UpdateHorarioProvaDto) {
    const {
      provaId,
      dataRealizacao,
      horaInicio,
      horaFim,
      salaId,
      poloId,
      userId,
      cursoId,
      periodoId,
      anoLetivoId,
    } = updateHorarioProvaDto;

    const checkQuery = `SELECT ID FROM FK2_TB_HORARIO_PROVA WHERE ID = :1`;
    const exists = await this.dataSource.query(checkQuery, [id]);

    if (!exists || exists.length === 0) {
      throw new NotFoundException('Horário de prova não encontrado');
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (provaId !== undefined) {
      updates.push(`PROVA_ID = :${paramIndex}`);
      parameters.push(provaId);
      paramIndex++;
    }

    if (dataRealizacao !== undefined) {
      updates.push(`DATA_REALIZACAO = TO_DATE(:${paramIndex}, 'YYYY-MM-DD')`);
      parameters.push(dataRealizacao);
      paramIndex++;
    }

    if (horaInicio !== undefined) {
      const [hh, mm, ss = 0] = horaInicio.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      updates.push(`HORA_INICIO = :${paramIndex}`);
      parameters.push(nanos);
      paramIndex++;
    }

    if (horaFim !== undefined) {
      const [hh, mm, ss = 0] = horaFim.split(':').map(Number);
      const nanos = hh * 3600000000000 + mm * 60000000000 + ss * 1000000000;
      updates.push(`HORA_FIM = :${paramIndex}`);
      parameters.push(nanos);
      paramIndex++;
    }

    if (salaId !== undefined) {
      updates.push(`SALA_ID = :${paramIndex}`);
      parameters.push(salaId);
      paramIndex++;
    }

    if (poloId !== undefined) {
      updates.push(`POLO_ID = :${paramIndex}`);
      parameters.push(poloId);
      paramIndex++;
    }

    if (userId !== undefined) {
      updates.push(`USER_ID = :${paramIndex}`);
      parameters.push(userId);
      paramIndex++;
    }

    if (cursoId !== undefined) {
      updates.push(`CURSO_ID = :${paramIndex}`);
      parameters.push(cursoId);
      paramIndex++;
    }

    if (periodoId !== undefined) {
      updates.push(`PERIODO_ID = :${paramIndex}`);
      parameters.push(periodoId);
      paramIndex++;
    }

    if (anoLetivoId !== undefined) {
      updates.push(`ANO_LECTIVO_ID = :${paramIndex}`);
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar');
    }

    updates.push('UPDATED_AT = SYSDATE');

    const query = `
      UPDATE FK2_TB_HORARIO_PROVA
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    try {
      await this.dataSource.query(query, parameters);

      return {
        message: 'Horário de prova atualizado com sucesso',
      };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao atualizar horário de prova: ' + error.message,
      );
    }
  }

  async remove(id: number) {
    const checkQuery = `SELECT ID FROM FK2_TB_HORARIO_PROVA WHERE ID = :1`;
    const exists = await this.dataSource.query(checkQuery, [id]);

    if (!exists || exists.length === 0) {
      throw new NotFoundException('Horário de prova não encontrado');
    }

    const query = `DELETE FROM FK2_TB_HORARIO_PROVA WHERE ID = :1`;

    try {
      await this.dataSource.query(query, [id]);

      return {
        message: 'Horário de prova removido com sucesso',
      };
    } catch (error) {
      throw new BadRequestException(
        'Erro ao remover horário de prova: ' + error.message,
      );
    }
  }
}
