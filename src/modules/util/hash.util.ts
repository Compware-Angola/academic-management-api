// src/common/utils/hash.util.ts

import axios from 'axios';

const HASH_SERVICE_URL = process.env.HASH_SERVICE_URL || 'http://192.168.30.45:3003/api';
const HASH_SERVICE_TIMEOUT = Number(process.env.HASH_SERVICE_TIMEOUT) || 10000; // em ms

export async function gerarHashExterno(senha: string): Promise<string> {
  if (!senha || senha.trim() === '') {
    throw new Error('Senha não pode ser vazia');
  }

  try {
    const response = await axios.post<{ hash: string }>(
      `${HASH_SERVICE_URL}/hash`,
      { texto: senha },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        timeout: HASH_SERVICE_TIMEOUT,
      }
    );

    if (!response.data?.hash) {
      throw new Error('Resposta inválida do serviço de hash: campo "hash" ausente');
    }

    return response.data.hash;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Serviço de hash indisponível (conexão recusada)');
      }
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Falha de rede ao contactar o serviço de hash');
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error(`Timeout ao contactar o serviço de hash (${HASH_SERVICE_TIMEOUT}ms)`);
      }

      const status = error.response?.status;
      throw new Error(
        `Erro ao gerar hash: ${status ? `HTTP ${status}` : error.message}`
      );
    }

    // Erro desconhecido
    throw new Error(`Falha inesperada ao gerar hash: ${error instanceof Error ? error.message : String(error)}`);
  }
}