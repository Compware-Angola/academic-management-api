// src/common/utils/hash.util.ts

import axios from 'axios';

export async function gerarHashExterno(senha: string): Promise<string> {
  if (!senha || senha.trim() === '') {
    throw new Error('Senha não pode ser vazia');
  }

  try {
    const response = await axios.post<{ hash: string }>(
      'http://192.168.30.45:3003/api/hash',
      { texto: senha },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        timeout: 10000,
      },
    );

    return response.data.hash;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Serviço de hash indisponível');
      }
      throw new Error(`Erro ao gerar hash: ${error.response?.status || error.message}`);
    }
    throw new Error('Falha inesperada ao gerar hash');
  }
}