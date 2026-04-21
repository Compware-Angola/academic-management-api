import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateDocumentoUCDto } from './dto/create-document.dto';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';


@Injectable()
export class DocumentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

async generateCode(dto:CreateDocumentoUCDto): Promise<{ codigo: string }> {
  const codigo = this.createRandomCode();

  await this.dataSource.query(
    `INSERT INTO FK2_TB_DOCUMENTOS_UC (
      DOCUMENTO,
      ANO_LETIVO,
      UTILIZADOR,
      DATAREGISTO,
      STATUS_,
      CODIGO_DOCUMENTO,
      CODIGO_MATRICULA,
      TIPO_DOCUMENTO,
      REF_UTILIZADOR
    ) VALUES (
      :documento,
      :anoLetivo,
      :utilizador,
      SYSDATE,
      :status,
      :codigoDocumento,
      :codigoMatricula,
      :tipoDocumento,
      :refUtilizador
    )`,
    {
      documento:dto.documento|| 'Certificado Com Notas',
      anoLetivo:dto.anoLetivo|| 23,
      utilizador: null,
      status: 'Ativo',
      codigoDocumento: codigo, 
      codigoMatricula: dto.codigoMatricula,
      tipoDocumento: dto.tipoDocumento,
      refUtilizador: JSON.stringify({
        pk: 1556,
        desc: 'Margarida da Silva Rodrigues',
        corLetra: 'black',
        disponivel: false,
      })
    } as any,
  );

  return { codigo };
}

  private createRandomCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    const rand = (chars: string, length: number) =>
      Array.from({ length }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');

    return `${rand(numbers, 5)}${rand(letters, 5)}`;
  }

async validateDocs(code: string,tipo_docs:number) {
  const result = await this.dataSource.query(
    `
    SELECT
        -- Matrícula
        m.CODIGO                AS CODIGO_MATRICULA,
        m.ESTADO_MATRICULA      AS ESTADO,

        -- Dados Pessoais
        p.NOME_COMPLETO         AS NOME_COMPLETO,
        p.BILHETE_IDENTIDADE    AS BI,
        p.EMAIL                 AS EMAIL,
        p.CONTACTOS_TELEFONICOS AS CONTACTO,
        p.CONTACTO_DE_EMERGENCIA AS CONTACTO_ALTERNATIVO,
        p.DATA_NASCIMENTO       AS DATA_NASCIMENTO,
        p.DATA_EMISSAO_BI       AS DATA_EMISSAO_BI,
        p.DATA_VALIDADE_BI      AS DATA_VALIDADE_BI,
        p.PAI                   AS PAI,
        p.MAE                   AS MAE,
        p.NATURALIDADE          AS NATURALIDADE,
        p.ESTADO_CIVIL          AS ESTADO_CIVIL,
        p.SEXO                  AS SEXO,
        p.MORADA_COMPLETA       AS MORADA,

        -- Nacionalidade
        nac.DESIGNACAO          AS NACIONALIDADE,

        -- Curso / Faculdade
        c.CODIGO                AS CURSO_CODIGO,
        c.DESIGNACAO            AS CURSO,
        fac.DESIGNACAO          AS FACULDADE,

        -- Período / Regime
        pe.DESIGNACAO           AS PERIODO,
        tpc.DESIGNACAO          AS GRAU,
        pr.DESIGNACAO           AS REGIME,

        -- Documento
        tpdoc.DESIGNACAO        AS TIPO_DOCUMENTO,

        -- Foto
        usr.FOTO                AS FOTO,
        
        -- DOCS
        tduc.DATAREGISTO        AS DATA_REGISTO,
        NVL(usr2.NOME, 'N/A')    AS UTILIZADOR

    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_ADMISSAO a
        ON a.CODIGO = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.CODIGO = a.PRE_INCRICAO
    INNER JOIN FK2_USERS usr
        ON usr.ID = p.USER_ID
    INNER JOIN FK2_TB_CURSOS c
        ON c.CODIGO = m.CODIGO_CURSO
    INNER JOIN FK2_TB_FACULDADE fac
        ON fac.CODIGO = c.FACULDADE_ID
    INNER JOIN FK2_TB_PERIODOS pe
        ON pe.CODIGO = p.CODIGO_TURNO
    INNER JOIN FK2_TB_NACIONALIDADES nac
        ON nac.CODIGO = p.CODIGO_NACIONALIDADE
    INNER JOIN FK2_TB_TIPO_CANDIDATURA tpc
        ON tpc.ID = p.CODIGO_TIPO_CANDIDATURA
    INNER JOIN FK2_TB_PERIODOS pr
        ON pr.CODIGO = p.CODIGO_TURNO
    INNER JOIN FK2_TB_DOCUMENTOS_UC tduc
        ON tduc.CODIGO_MATRICULA = m.CODIGO
    INNER JOIN FK2_TB_TIPO_DOCUMENTOS tpdoc
        ON tpdoc.CODIGO = tduc.TIPO_DOCUMENTO
    LEFT JOIN FK2_MCA_TB_UTILIZADOR usr2
        ON usr2.PK_UTILIZADOR = JSON_VALUE(tduc.REF_UTILIZADOR, '$.pk')

    WHERE tduc.CODIGO_DOCUMENTO = :code
    FETCH FIRST 1 ROWS ONLY
    `,
    { code } as any
  );

  if (!result || result.length === 0) {
    throw new NotFoundException("Documento não encontrado");
  }

  return toLowerCaseKeys(result[0]);
}
}
