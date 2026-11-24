import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@meskot/shared-types';

export const PERMISSIONS_KEY = 'required_permissions';
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
