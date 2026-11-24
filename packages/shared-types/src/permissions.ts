export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  SALES_MANAGER: 'SALES_MANAGER',
  DELIVERY_MANAGER: 'DELIVERY_MANAGER',
  DELIVERY_AGENT: 'DELIVERY_AGENT',
  CUSTOMER: 'CUSTOMER',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const PERMISSION_CODES = {
  PRODUCTS_READ: 'products:read',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_ARCHIVE: 'products:archive',
  CATEGORIES_MANAGE: 'categories:manage',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_RECEIVE: 'inventory:receive',
  INVENTORY_ADJUST: 'inventory:adjust',
  WAREHOUSES_MANAGE: 'warehouses:manage',
  ORDERS_READ: 'orders:read',
  ORDERS_UPDATE: 'orders:update',
  CUSTOMERS_READ: 'customers:read',
  RETURNS_MANAGE: 'returns:manage',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_RECONCILE: 'payments:reconcile',
  DELIVERIES_READ: 'deliveries:read',
  DELIVERIES_ASSIGN: 'deliveries:assign',
  DELIVERIES_ASSIGNED_READ: 'deliveries:assigned:read',
  DELIVERIES_ASSIGNED_UPDATE: 'deliveries:assigned:update',
  REPORTS_READ: 'reports:read',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  AUDIT_READ: 'audit:read',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
