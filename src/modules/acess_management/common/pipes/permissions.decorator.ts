import { SetMetadata } from '@nestjs/common';


export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para definir as permissões necessárias para acessar um endpoint.
 *
 * Exemplo de uso:
 * @Permissions(PermissionType.UsersCreate)
 */
export const RequiredPermissions = (...permissions: Permissions[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
