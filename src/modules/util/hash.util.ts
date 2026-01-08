// src/common/utils/hash.util.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HashUtilService {
  private readonly hashServiceUrl: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.hashServiceUrl =
      this.configService.get<string>('HASH_SERVICE_URL') ||
      'http://192.168.30.45:3003/api/hash';

    this.timeout =
      this.configService.get<number>('HASH_SERVICE_TIMEOUT') || 10000;

    console.log('[HashUtilService] URL:', this.hashServiceUrl);
    console.log('[HashUtilService] Timeout:', this.timeout + 'ms');
  }

  async gerarHashExterno(senha: string): Promise<string> {
    if (!senha || senha.trim() === '') {
      throw new Error('Senha não pode ser vazia');
    }

    try {
      const response = await axios.post<{ hash: string }>(
        `${this.hashServiceUrl}/hash`,
        { texto: senha },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*',
          },
          timeout: this.timeout,
        },
      );

      if (!response.data?.hash) {
        throw new Error('Resposta inválida: campo "hash" ausente');
      }

      return response.data.hash;
    } catch (error) {
      // mesmo tratamento de erros que tinhas
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Serviço de hash indisponível');
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new Error(`Timeout de ${this.timeout}ms excedido`);
        }
        throw new Error(`Erro HTTP ${error.response?.status || error.message}`);
      }
      throw new Error('Falha inesperada ao gerar hash');
    }
  }
}