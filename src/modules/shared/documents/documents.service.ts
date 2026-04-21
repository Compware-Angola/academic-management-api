import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateDocumentoUCDto } from './dto/create-document.dto';


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
      REF_UTILIZADOR,
      CODIGO
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
      documento: 'Certificado Com Notas',
      anoLetivo: '23',
      utilizador: null,
      status: 'Ativo',
      codigoDocumento: codigo, 
      codigoMatricula: 44366,
      tipoDocumento: 7,
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
}
