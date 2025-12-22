// src/users/referencias.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReferenciaDto } from '../shared/dto/referencia.dto';

@Injectable()
export class ReferenciasService {
  constructor(private readonly dataSource: DataSource) {}

  async findAllEstadoCivil(): Promise<ReferenciaDto[]> {
    const result = await this.dataSource.query(`
      SELECT CODIGO, DESIGNACAO
      FROM CMPDEV.FK2_TB_ESTADO_CIVIL
      ORDER BY DESIGNACAO
    `);

    return result.map((row: any) => new ReferenciaDto(row.CODIGO, row.DESIGNACAO));
  }

  async findAllNacionalidades(): Promise<ReferenciaDto[]> {
    const result = await this.dataSource.query(`
      SELECT CODIGO, DESIGNACAO
      FROM CMPDEV.FK2_TB_NACIONALIDADES
      ORDER BY DESIGNACAO
    `);

    return result.map((row: any) => new ReferenciaDto(row.CODIGO, row.DESIGNACAO));
  }

  async findAllTipoDocumentos(): Promise<ReferenciaDto[]> {
    const result = await this.dataSource.query(`
      SELECT CODIGO, DESIGNACAO
      FROM CMPDEV.FK2_TB_TIPO_DOCUMENTOS
      ORDER BY DESIGNACAO
    `);

    return result.map((row: any) => new ReferenciaDto(row.CODIGO, row.DESIGNACAO));
  }

  async findAllSexo(): Promise<ReferenciaDto[]> {
    const result = await this.dataSource.query(`
      SELECT CODIGO, DESIGNACAO
      FROM CMPDEV.FK2_TB_SEXO
      ORDER BY DESIGNACAO
    `);

    return result.map((row: any) => new ReferenciaDto(row.CODIGO, row.DESIGNACAO));
  }
}