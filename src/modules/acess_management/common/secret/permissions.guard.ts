import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../pipes/permissions.decorator';
import { PermissionType } from '../enums/permission.type';


declare module 'express' {
    interface Request {
        user: any;
    }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions) {
            return true;
        }
        const req = context.switchToHttp().getRequest<Request>();
        const userPermissions = req.user?.permissions;
        const hasFullAccess = userPermissions.includes(PermissionType.FullAccess);
        if (hasFullAccess) {
            return true;
        }

        if (!userPermissions || userPermissions.length === 0) {
            throw new ForbiddenException('Você não tem permissões suficientes para acessar este recurso.');
        }
        const hasRequiredPermissions = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );
        if (!hasRequiredPermissions) {
            throw new ForbiddenException('Você não tem as permissões necessárias para acessar este recurso.');
        }

        return true;
    }
}
