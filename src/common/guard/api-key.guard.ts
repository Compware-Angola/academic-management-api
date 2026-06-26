import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    const apiKey = request.headers['x-api-key'];

    console.log(apiKey);
    
    const validKey = process.env.API_KEY;

    if (!apiKey || apiKey !== validKey) {
      throw new ForbiddenException(
        `API Key inválida ou ausente. Acesso negado. O seu perfil de utilizador não está autorizado a executar esta operação. Por favor, contacte o administrador do sistema para obter as permissões necessárias.`,
      );
    }

    return true;
  }
}