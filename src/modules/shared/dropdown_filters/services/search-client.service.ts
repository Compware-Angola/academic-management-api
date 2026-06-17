import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchClientDto, SearchClientType } from '../dto/search.client.dto';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';

@Injectable()
export class SearchClientService {
  constructor(private readonly dataSource: DataSource) {}

  async find(data: SearchClientDto) {
    const { searchTerm, type } = data;

    if (!searchTerm?.trim()) {
      throw new BadRequestException('Informe o termo de pesquisa');
    }
    switch (type) {
      case SearchClientType.STUDENT:
        return {
          institution: null,
          person: await this.findStudent(searchTerm),
        };

      case SearchClientType.INSTITUTION:
        return {
          institution: await this.findInstitution(searchTerm),
          person: null,
        };

      default:
        throw new BadRequestException('Tipo inválido');
    }
  }

  private async findInstitution(searchTerm: string) {
    const sql = `
      SELECT
          nif              AS nif,
          endereco         AS address,
          instituicao      AS institution,
          contacto         AS contact,
          sigla            AS sigla,
          codigo           AS code
      FROM FK2_TB_INSTITUICAO
      WHERE nif = :searchTerm
    `;

    const result = await this.dataSource.query(sql, { searchTerm } as any);

    if (!result?.length) {
      throw new NotFoundException('Instituição não encontrada');
    }

    return toLowerCaseKeys(result[0]);
  }

  private async findStudent(searchTerm: string) {
    const sql = `
      SELECT
          m.codigo                        AS enrollmentCode,
          p.nome_completo                 AS name,
          u.email                         AS email,
          p.CONTACTOS_TELEFONICOS         AS phone,
          p.BILHETE_IDENTIDADE            AS bi,
          p.DATA_NASCIMENTO               AS birthDate,
          p.SEXO                          AS gender,
          c.DESIGNACAO                    AS course,
          ca.DESIGNACAO                   AS nivel
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_ADMISSAO a
          ON a.codigo = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
          ON p.codigo = a.PRE_INCRICAO
      INNER JOIN FK2_USERS u
          ON u.id = p.USER_ID
      INNER JOIN FK2_TB_CURSOS c
          ON c.codigo = m.CODIGO_CURSO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
          ON ca.id = c.TIPO_CANDIDATURA
      WHERE
          m.codigo = :searchTerm
          OR p.BILHETE_IDENTIDADE = :searchTerm
    `;

    const result = await this.dataSource.query(sql, { searchTerm } as any);

    if (!result?.length) {
      throw new NotFoundException('Estudante não encontrado');
    }

    return toLowerCaseKeys(result[0]);
  }
}
