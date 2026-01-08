// src/common/utils/hash.util.ts

import axios from 'axios';

export async function gerarHashExterno(senha: string): Promise<string> {
  if (!senha || senha.trim() === '') {
    throw new Error('Senha não pode ser vazia');
  }

  const hashServiceUrl = process.env.HASH_SERVICE_URL;

  if (!hashServiceUrl) {
    throw new Error('HASH_SERVICE_URL não definida no .env');
  }
 console.log(hashServiceUrl);
 
  try {
    const response = await axios.post<{ hash: string }>(
      `${hashServiceUrl}/hash`,
      { texto: senha },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
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
      throw new Error(
        `Erro ao gerar hash: ${error.response?.status || error.message}`,
      );
    }
    throw new Error('Falha inesperada ao gerar hash');
  }
}
