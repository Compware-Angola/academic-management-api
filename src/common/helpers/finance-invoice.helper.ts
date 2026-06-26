import { HttpService } from '@nestjs/axios';
import { Logger, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

export interface InvoicePayload {
  DataFactura: Date;
  polo_id: number;
  TotalPreco: number;
  codigo_descricao: number;
  ValorAPagar: number;
  total_incidencia: number;
  total_retencao: number;
  CodigoMatricula: number;
  codigo_preinscricao: number;
  Desconto: number;
  totalIVA: number;
  TotalMulta: number;
  Descricao: string;
  tipo_documento_factura_id: number;
  canal: number;
  codigo_anoLectivo: number;
  itens: Iten[];
}

export interface Iten {
  CodigoProduto: number;
  Quantidade: number;
  preco: number;
  Total: number;
  valor_pago: number;
  obs: string;
  taxaIva: number;
  valorIva: number;
  retencao: number;
  incidencia: number;
  valorDesconto: number;
  descontoProduto: number;
  mes: string;
  multa: number;
  estado: number;
  valorPago: number;
  valorATransportar: number;
  codigo_anoLectivo: number;
}

export class FinanceInvoiceHelper {
  private static readonly logger = new Logger(FinanceInvoiceHelper.name);

  private static getInvoiceUrl(): string {
    const baseUrl =
      process.env.API_BASE_URL_FINANCE || 'http://localhost:3002/api';
    return `${baseUrl}/invoices/no-job`;
  }
  static async createInvoice(
    httpService: HttpService,
    payload: InvoicePayload,
  ): Promise<any> {
    const url = this.getInvoiceUrl();

    try {
      this.logger.log(
        `Gerando fatura para matrícula: ${payload.CodigoMatricula}`,
      );

      const response = await lastValueFrom(
        httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 15000,
        }),
      );

      this.logger.debug(
        `Fatura gerada com sucesso. ID: ${response.data?.Codigo}`,
      );
      return response.data;
    } catch (err) {
      this.logger.error('Falha ao comunicar com o serviço financeiro', {
        error: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });

      throw new InternalServerErrorException(
        'Não foi possível gerar a fatura. A inscrição não foi concluída.',
      );
    }
  }
}
