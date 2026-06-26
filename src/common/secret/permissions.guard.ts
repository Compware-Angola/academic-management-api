import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../pipes/permissions.decorator';
import { PermissionTypeDetails } from '../enums/permission.type';

declare module 'express' {
  interface Request {
    user: any; // idealmente tipa com tua interface de User JWT
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sem permissões definidas → deixa passar
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const userPermissions: string[] = req.user?.permissions || [];

    // FULL_ACCESS sempre ganha
    if (userPermissions.includes(PermissionTypeDetails.FULL_ACCESS.sigla)) {
      return true;
    }

    // Lógica OR: basta ter PELO MENOS UMA das permissões requeridas
    const hasAtLeastOne = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAtLeastOne) {
    throw new ForbiddenException(
  `Acesso negado. O seu perfil de utilizador não está autorizado a executar esta operação.
  Por favor, contacte o administrador do sistema para obter as permissões necessárias.`,
);
    }

    return true;
  }
}