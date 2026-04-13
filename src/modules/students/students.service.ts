import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import {
  FindStudentsDTO,
  ResetStudentPasswordDTO,
  UpdateStudentContactDTO,
  UpdateStudentPersonalDataDTO,
} from './dto/find-students.dto';
import { gerarHashExterno } from '../util/hash.util';
import { ActivateRegistrationDTO } from './dto/activate-registration.dto';
import { AcademicHistoryDTO } from './dto/academic-history';
import { ChangeCourseDTO } from './dto/change-course.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Injectable()
export class StudentsService {

  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) {

  }


  async getProfileEstatistic(codigoMatricula: number): Promise<any> {
    const sql = `
    SELECT
    m.codigo               AS codigo_matricula,
    p.BILHETE_IDENTIDADE   AS bi,
    c.designacao           AS curso,
    pe.DESIGNACAO          AS periodo,
    m.ESTADO_MATRICULA     AS estado,
    p.Nome_Completo        AS nome_completo,
    p.Bilhete_Identidade   AS bi_aluno,
    p.Email                AS email,
    p.Contactos_Telefonicos AS contacto,
    p.CONTACTO_DE_EMERGENCIA AS contacto_alternativo,
    p.Data_Nascimento      AS data_nascimento,
    p.DATA_EMISSAO_BI      AS data_emissao_bi,
    p.DATA_VALIDADE_BI     AS data_validade_bi,
    p.PAI                  AS pai,
    p.MAE                  AS mae,
    p.CODIGO_OCUPACAO      AS ocupacao_codigo,
    p.CODIGO_PROFISSAO     AS profissao_codigo,
    p.NATURALIDADE         AS naturalidade,
    nac.DESIGNACAO         AS nacionalidade,
    p.ESTADO_CIVIL         AS estado_civil,
    p.SEXO                 AS sexo,
    fac.DESIGNACAO         AS faculdade,
    tpc.DESIGNACAO         AS grau,
    pr.DESIGNACAO          AS regime,
    p.MORADA_COMPLETA      AS morada,
    p.SALDO_RESET       AS saldo_atual,
    p.SALDO_RESET_ANTER AS saldo_anterior,
    u.FOTO                 AS foto
FROM FK2_TB_MATRICULAS m
INNER JOIN FK2_TB_ADMISSAO a
    ON a.codigo = m.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO p
    ON p.codigo = a.PRE_INCRICAO
INNER JOIN FK2_USERS u
    ON u.ID = p.USER_ID
INNER JOIN FK2_TB_CURSOS c
    ON c.codigo = m.CODIGO_CURSO
INNER JOIN FK2_TB_FACULDADE fac
    ON fac.codigo = c.FACULDADE_ID
INNER JOIN FK2_TB_PERIODOS pe
    ON pe.codigo = p.CODIGO_TURNO
INNER JOIN FK2_TB_NACIONALIDADES nac
    ON nac.CODIGO = p.CODIGO_NACIONALIDADE
INNER JOIN FK2_TB_TIPO_CANDIDATURA tpc
    ON tpc.ID = p.CODIGO_TIPO_CANDIDATURA
INNER JOIN FK2_TB_PERIODOS pr
    ON pr.CODIGO = p.CODIGO_TURNO
WHERE m.codigo = :codigoMatricula

    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    return toLowerCaseKeys(result[0]) || null;
  }

  async getSugestoes(search: string): Promise<any[]> {
    if (!search || search.trim().length < 2) {
      return [];
    }

    const sql = `
    SELECT
        m.codigo               AS codigo_matricula,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        pe.DESIGNACAO          AS periodo,
         p.Nome_Completo              AS nome_completo,
        m.ESTADO_MATRICULA     AS estado
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_ADMISSAO      a  ON a.codigo  = m.CODIGO_ALUNO
     INNER JOIN FK2_TB_PREINSCRICAO p
             ON p.Codigo = a.pre_incricao
    INNER JOIN FK2_TB_PREINSCRICAO  p  ON p.codigo  = a.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS        c  ON c.codigo  = m.CODIGO_CURSO
    INNER JOIN FK2_TB_PERIODOS      pe ON pe.codigo = p.CODIGO_TURNO
    WHERE
        TO_CHAR(m.codigo)         LIKE :search
       OR p.BILHETE_IDENTIDADE      LIKE :search
       OR LOWER(c.designacao)       LIKE LOWER(:search)
       OR  LOWER(p.Nome_Completo)          LIKE LOWER(:search)


    FETCH FIRST 10 ROWS ONLY
  `;
    const result = await this.dataSource.query(sql, {
      search: `%${search}%`,
    } as any);
    return toLowerCaseKeys(result);
  }

  async findStudents(filters: FindStudentsDTO) {
    const {
      anoLectivo,
      codigoCurso,
      faculdadeId,
      codigoMatricula,
      limit = 25,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`
    EXISTS (
      SELECT 1
      FROM FK2_TB_CONFIRMACOES con
      WHERE con.CODIGO_MATRICULA = m.codigo
    )
  `);

    if (anoLectivo) {
      conditions.push(`con.CODIGO_ANO_LECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }

    if (codigoCurso) {
      conditions.push(`c.codigo = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }

    if (faculdadeId) {
      conditions.push(`c.FACULDADE_ID = :faculdadeId`);
      params.faculdadeId = faculdadeId;
    }

    if (codigoMatricula) {
      conditions.push(`m.codigo = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';

    const sql = `
    SELECT
      m.codigo               AS codigo_matricula,
      p.NOME_COMPLETO        AS nome_completo,
      p.BILHETE_IDENTIDADE   AS bi,
      c.designacao           AS curso,
      ca.DESIGNACAO          AS candidatura
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
    WHERE ${whereClause}
    ORDER BY m.codigo DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
    WHERE ${whereClause}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async resetPassword(body: ResetStudentPasswordDTO) {
    const sql = `SELECT
  TU."ID" as user_id
FROM FK2_TB_MATRICULAS M
INNER JOIN FK2_TB_ADMISSAO TA
  ON TA."CODIGO" = M."CODIGO_ALUNO"
INNER JOIN FK2_TB_PREINSCRICAO TP
  ON TP."CODIGO" = TA."PRE_INCRICAO"
INNER JOIN FK2_USERS TU
  ON TP."USER_ID" = TU."ID"
WHERE M."CODIGO" = :codigoMatricula`;

    const result = await this.dataSource.query(sql, {
      codigoMatricula: body.codigoMatricula,
    } as any);

    if (!result || result.length === 0) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    const hash = await gerarHashExterno(body.senha);

    await this.dataSource.query(
      `
    UPDATE FK2_USERS
    SET "PASSWORD" = :hash
    WHERE "ID" = :user_id
    `,
      { hash: hash, user_id: toLowerCaseKeys(result[0]).user_id } as any,
    );

    return { message: 'Senha atualizada com sucesso' };
  }

  async updateContactos(body: UpdateStudentContactDTO) {
    const { codigoMatricula, email, contacto, contactoAlternativo } = body;

    if (!email && !contacto && !contactoAlternativo) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualizar',
      );
    }
    if (email) {
      const emailExiste = await this.dataSource.query(
        `
      SELECT 1 FROM FK2_TB_PREINSCRICAO
      WHERE "EMAIL" = :email
      `,
        { email } as any,
      );

      if (emailExiste.length > 0) {
        throw new BadRequestException('Email já está em uso');
      }
    }
    const fields: string[] = [];
    const params: any = { codigoMatricula };

    if (email) {
      fields.push(`TP."EMAIL" = :email`);
      params.email = email;
    }

    if (contacto) {
      fields.push(`TP."CONTACTOS_TELEFONICOS" = :contacto`);
      params.contacto = contacto;
    }

    if (contactoAlternativo) {
      fields.push(`TP."CONTACTO_DE_EMERGENCIA" = :contactoAlternativo`);
      params.contactoAlternativo = contactoAlternativo;
    }

    fields.push(`TP."UPDATED_AT" = SYSDATE`);

    const result = await this.dataSource.query(
      `
    UPDATE FK2_TB_PREINSCRICAO TP
    SET ${fields.join(', ')}
    WHERE TP."CODIGO" = (
      SELECT TA."PRE_INCRICAO"
      FROM FK2_TB_MATRICULAS M
      INNER JOIN FK2_TB_ADMISSAO TA
        ON TA."CODIGO" = M."CODIGO_ALUNO"
      WHERE M."CODIGO" = :codigoMatricula
    )
    `,
      params,
    );

    if (!result) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    return { message: 'Contactos atualizados com sucesso' };
  }
  async updatePersonalData(body: UpdateStudentPersonalDataDTO) {
    const { codigoMatricula, ...data } = body;

    const fieldMapping: Record<string, string> = {
      nomeCompleto: 'NOME_COMPLETO',
      dataNascimento: 'DATA_NASCIMENTO',
      genero: 'SEXO',
      numeroBI: 'BILHETE_IDENTIDADE',
      dataEmissao: 'DATA_EMISSAO_BI',
      dataValidade: 'DATA_VALIDADE_BI',
      nacionalidade: 'CODIGO_NACIONALIDADE',
      nomePai: 'PAI',
      nomeMae: 'MAE',
      profissao: 'CODIGO_PROFISSAO',
      ocupacao: 'CODIGO_OCUPACAO',
      naturalidade: 'NATURALIDADE',
      morada: 'MORADA_COMPLETA',
    };

    const fields: string[] = [];
    const params: any = { codigoMatricula };

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && fieldMapping[key]) {
        fields.push(`TP."${fieldMapping[key]}" = :${key}`);

        if (key.toLowerCase().includes('data') && data[key]) {
          params[key] = new Date(data[key]);
        } else {
          params[key] = data[key];
        }
      }
    });

    if (fields.length === 0) {
      throw new BadRequestException(
        'Nenhum campo válido para atualização foi fornecido',
      );
    }

    fields.push(`TP."UPDATED_AT" = SYSDATE`);

    const sql = `
    UPDATE FK2_TB_PREINSCRICAO TP
    SET ${fields.join(', ')}
    WHERE TP."CODIGO" = (
      SELECT TA."PRE_INCRICAO"
      FROM FK2_TB_MATRICULAS M
      INNER JOIN FK2_TB_ADMISSAO TA ON TA."CODIGO" = M."CODIGO_ALUNO"
      WHERE M."CODIGO" = :codigoMatricula
    )
  `;

    const result = await this.dataSource.query(sql, params);

    if (!result) {
      throw new NotFoundException(
        'Estudante não encontrado para a matrícula informada',
      );
    }

    return { message: 'Dados pessoais atualizados com sucesso' };
  }
  async activateRegistration(dto: ActivateRegistrationDTO, usuarioLogado: any) {
    const { codigoMatricula, anoLectivoId } = dto;

    if (!codigoMatricula || !anoLectivoId) {
      throw new BadRequestException('Código da matrícula e ano letivo são obrigatórios');
    }

    try {

      const sqlVerificarDiplomado = `
      SELECT 
        M."ESTADO_MATRICULA"
      FROM FK2_TB_MATRICULAS M
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const matriculaAtual = await this.dataSource.query(sqlVerificarDiplomado, {
        codigoMatricula
      } as any);

      if (matriculaAtual.length === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      const status = matriculaAtual[0];

      // Se já estiver diplomado, não permite ativar novamente
      if (status.ESTADO_MATRICULA === 'Diplomado' ||
        status.ESTADO_MATRICULA === 'diplomado' ||
        status.ESTADO_MATRICULA === 'concluido') {

        throw new BadRequestException('Não é possível ativar esta matrícula. O aluno já está diplomado.');
      }
      // ====================== 1. BUSCAR ISENÇÕES DE PROPINA ATIVAS ======================
      const sqlBuscarPropinas = `
      SELECT 
        I.CODIGO as "codigoIsencao",
        S.DESCRICAO as "servico",
        S.PRECO as "valor",
        I.MES_TEMP_ID as "mesId",
        I.OBS as "observacao"
      FROM FK2_TB_ISENCOES I
      INNER JOIN FK2_TB_TIPO_SERVICOS S 
        ON S."CODIGO" = I."CODIGO_SERVICO"
      WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
        AND I.CODIGO_MATRICULA = :codigoMatricula
        AND UPPER(I.ESTADO_ISENSAO) = 'ACTIVO'
        AND UPPER(S.DESCRICAO) LIKE 'PROPINA%'
      ORDER BY I.CREATED_AT DESC
    `;
      const isencoesPropina = await this.dataSource.query(sqlBuscarPropinas, {
        codigoMatricula,
        anoLectivoId,
      } as any);

      console.log('Isenções encontradas:', isencoesPropina);

      // ====================== 2. DESATIVAR ISENÇÕES DE PROPINA ======================
      let isencoesDesativadas = 0;

      if (isencoesPropina.length > 0) {
        const ref_utilizado = { pk: usuarioLogado?.sub, desc: usuarioLogado?.name, corLetra: "black", disponivel: false };

        // Desativar as isenções
        const sqlDesativarPropinas = `
        UPDATE FK2_TB_ISENCOES I
        SET I."ESTADO_ISENSAO" = 'Inactivo',
            I."OBS" = 'Isenção de propina removida automaticamente durante a activação da matrícula.',
            I."REF_UTILIZADO" = :refUtilizado,
            I."UPDATED_AT" = SYSDATE
        WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
          AND I.CODIGO_MATRICULA = :codigoMatricula
          AND UPPER(I.ESTADO_ISENSAO) = 'ACTIVO'
          AND I."CODIGO_SERVICO" IN (
            SELECT S."CODIGO" 
            FROM FK2_TB_TIPO_SERVICOS S 
            WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
          )
      `;

        const result = await this.dataSource.query(sqlDesativarPropinas, {
          codigoMatricula,
          anoLectivoId,
          refUtilizado: JSON.stringify(ref_utilizado),
        } as any);

        console.log(result);


        isencoesDesativadas = result || 0;

        // ====================== 3. DESATIVAR FACTURAS E ITENS DE PROPINA ======================
        // Atualiza os ITEMS primeiro
        const sqlDesativarItems = `
        UPDATE FK2_FACTURA_ITEMS fi
        SET fi.ESTADO = 0
        WHERE fi.MES_TEMP_ID IN (
          SELECT I.MES_TEMP_ID 
          FROM FK2_TB_ISENCOES I
          WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
            AND I.CODIGO_MATRICULA = :codigoMatricula
            AND UPPER(I.ESTADO_ISENSAO) = 'INACTIVO' 
            AND I."CODIGO_SERVICO" IN (
              SELECT S."CODIGO" 
              FROM FK2_TB_TIPO_SERVICOS S 
              WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
            )
        )
        AND EXISTS (
          SELECT 1 FROM FK2_FACTURA f 
          WHERE f.CODIGO = fi.CODIGOFACTURA
            AND f.CODIGOMATRICULA = :codigoMatricula
            AND f.ANO_LECTIVO = :anoLectivoId
        )
      `;

        await this.dataSource.query(sqlDesativarItems, { codigoMatricula, anoLectivoId } as any);

        // Atualiza as FACTURAS
        const sqlDesativarFacturas = `
        UPDATE FK2_FACTURA f
        SET f.ESTADO = 0
        SET f.VALORISENTO = 0
        WHERE f.CODIGOMATRICULA = :codigoMatricula
          AND f.ANO_LECTIVO = :anoLectivoId
          AND EXISTS (
            SELECT 1 FROM FK2_FACTURA_ITEMS fi 
            WHERE fi.CODIGOFACTURA = f.CODIGO
              AND fi.MES_TEMP_ID IN (
                SELECT I.MES_TEMP_ID 
                FROM FK2_TB_ISENCOES I
                WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
                  AND I.CODIGO_MATRICULA = :codigoMatricula
                  AND I."CODIGO_SERVICO" IN (
                    SELECT S."CODIGO" FROM FK2_TB_TIPO_SERVICOS S 
                    WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
                  )
              )
          )
      `;

        await this.dataSource.query(sqlDesativarFacturas, { codigoMatricula, anoLectivoId } as any);
      }

      // ====================== 4. ATIVAR A MATRÍCULA ======================
      const sqlAtivarMatricula = `
      UPDATE FK2_TB_MATRICULAS M
      SET M."ESTADO_MATRICULA" = 'activo',
          M."UPDATED_AT" = SYSDATE
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const resultMatricula = await this.dataSource.query(sqlAtivarMatricula, {
        codigoMatricula
      } as any);

      if (resultMatricula[1] === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      // ====================== RESPOSTA ======================
      return {
        sucesso: true,
        mensagem: 'Matrícula ativada com sucesso',
        isencoesDePropinaDesativadas: isencoesDesativadas,
        detalhes: isencoesPropina.length > 0
          ? `${isencoesDesativadas} isenção(ões) de propina foram desativadas e as faturas relacionadas foram anuladas.`
          : 'Nenhuma isenção de propina ativa foi encontrada.'
      };

    } catch (error) {
      console.error('Erro ao ativar matrícula:', error);
      throw new BadRequestException(error || 'Erro ao ativar matrícula');
    }
  }

  async academicHistory(dto: AcademicHistoryDTO) {
    const { anoLectivoId, matriculaId, tipoProvaId, tipoAvaliacaoId, classeId, search, page = 1, limit = 10 } = dto;

    const offset = (page - 1) * limit;

    const query = `
    SELECT
      c.DESIGNACAO AS curso,
      d.DESIGNACAO AS unidade_curricular,
      TAV.DESIGNACAO AS tipo_avaliacao,
      ANL.DESIGNACAO AS ano_lectivo,
      CL.DESIGNACAO AS ano_curricular,
      AVA.NOTA_ANTERIOR AS nota_anterior,
      tp2.NOME_COMPLETO AS utilizador,
      AVA.OBSERVACAO AS OBSERVACAO,
      AVA.NOTA AS NOTA,
      MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
      MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
      ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
    LEFT JOIN FK2_TB_TIPO_AVALIACAO TAV ON TAV.CODIGO = AVA.TIPO_AVALIACAO
    LEFT JOIN FK2_TB_ANO_LECTIVO ANL ON ANL.CODIGO = GCA.CODIGO_ANO_LECTIVO
    LEFT JOIN FK2_MCA_TB_UTILIZADOR mtu
      ON mtu.PK_UTILIZADOR = JSON_VALUE(AVA.REF_UTILIZADOR, '$.pk')
    LEFT JOIN FK2_TB_PESSOA tp2 ON tp2.PK_PESSOA = JSON_VALUE(mtu.REF_PESSOA, '$.pk')
    LEFT JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
    LEFT JOIN FK2_TB_CLASSES CL ON CL.CODIGO = GC.CODIGO_CLASSE
    LEFT JOIN FK2_TB_CURSOS c ON c.CODIGO = GC.CODIGO_CURSO
    LEFT JOIN FK2_TB_DISCIPLINAS d ON d.CODIGO = GC.CODIGO_DISCIPLINA
    LEFT JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    LEFT JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO

    WHERE
      GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
      AND MAT.CODIGO = :matriculaId
      AND AVA.TIPO_AVALIACAO IS NOT NULL
      ${tipoProvaId ? 'AND AVA.TIPO_DE_PROVA = :tipoProvaId' : ''}
      ${tipoAvaliacaoId ? 'AND AVA.TIPO_AVALIACAO = :tipoAvaliacaoId' : ''}
      ${classeId ? 'AND GC.CODIGO_CLASSE = :classeId' : ''}
      ${search ? 'AND UPPER(d.DESIGNACAO) LIKE UPPER(:search)' : ''}

    GROUP BY
      GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
      AVA.CODIGO, AVA.OBSERVACAO, AVA.NOTA, c.DESIGNACAO, d.DESIGNACAO,
      ANL.DESIGNACAO, TAV.DESIGNACAO, CL.DESIGNACAO, tp2.NOME_COMPLETO, AVA.NOTA_ANTERIOR

    ORDER BY PRE.NOME_COMPLETO
    OFFSET :offset ROWS FETCH NEXT :fetchLimit ROWS ONLY
  `;

    const params: Record<string, any> = {
      anoLectivoId,
      matriculaId,
      offset,
      fetchLimit: limit + 1,
    };

    if (tipoProvaId) params.tipoProvaId = tipoProvaId;
    if (tipoAvaliacaoId) params.tipoAvaliacaoId = tipoAvaliacaoId;
    if (classeId) params.classeId = classeId;
    if (search) params.search = `%${search}%`;

    const result = await this.dataSource.query(query, params as any);

    const hasNextPage = result.length > limit;
    if (hasNextPage) result.pop();

    return {
      success: true,
      data: await toLowerCaseKeys(result),
      page,
      limit,
      hasNextPage,
    };
  }
  async changeCourse(dto: ChangeCourseDTO) {
    const { PoloId, matriculaId, cursoId } = dto;
     let  mudarCurso = true;
     let            buscarHorario = true;
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    if (!anoCorrente) {
      throw new BadRequestException('Ano letivo atual não encontrado');
    }

    if (!matriculaId) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }
    if (!PoloId && !cursoId) {
      throw new BadRequestException('Polo ou curso deve ser informado para a alteração');
    }
    const matriculaDetails = await this.getMatriculaDetails(matriculaId);
    const confirmationExists = await this.confirmationExists(matriculaId, anoCorrente);
    if (confirmationExists || matriculaDetails.estado.toLowerCase() === 'activo') {
      return {
        message: 'Funcionalidade de mudança de curso ainda não implementada',
        matriculaDetails,
        confirmationExists
      };
    
    } else {
      return {
        message: 'Matrícula não ativa e sem confirmação para o ano letivo atual. A troca de curso não pode ser realizada.',
        matriculaDetails,
        confirmationExists
      };

    }




  }

  private async getMatriculaDetails(codigoMatricula: number) {
    const sql = `
    SELECT
      m.codigo               AS codigo_matricula,
      m.ESTADO_MATRICULA     AS estado,
      p.NOME_COMPLETO        AS nome_completo,
      p.BILHETE_IDENTIDADE   AS bi,
      c.designacao           AS curso,
      ca.DESIGNACAO          AS candidatura
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
    WHERE m.codigo = :codigoMatricula
  `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    if (!result || result.length === 0) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    return toLowerCaseKeys(result[0]);
  }
  private async confirmationExists(codigoMatricula: number, anoLectivoId: number): Promise<boolean> {
    const sql = `
      SELECT *
      FROM FK2_TB_CONFIRMACOES con
      WHERE con.CODIGO_MATRICULA = :codigoMatricula
        AND con.CODIGO_ANO_LECTIVO = :anoLectivoId
    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
      anoLectivoId,
    } as any);
    return result && result.length > 0;
  }

}
