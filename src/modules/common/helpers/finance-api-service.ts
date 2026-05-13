// src/common/helpers/finance-api.service.ts

import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class FinanceApiService {
  private readonly baseUrl = process.env.FINANCE_API_URL;

  async createInvoice(payload: any) {
    if (!this.baseUrl) {
      throw new BadRequestException('FINANCE_API_URL não definida no .env');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/invoices/no-job`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      });

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao criar fatura na API financeira.',
      );
    }
  }

  async annulInvoice(codigoFactura: number) {
    await axios.delete(`${this.baseUrl}/invoices/${codigoFactura}`, {
      headers: {
      'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

}