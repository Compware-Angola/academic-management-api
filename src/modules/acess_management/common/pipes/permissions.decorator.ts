import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '../enums/permission.type';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para definir as permissões necessárias para acessar um endpoint.
 *
 * Exemplo de uso:
 * @Permissions(PermissionType.UsersCreate)
 */
export const RequiredPermissions = (...permissions: PermissionType[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
