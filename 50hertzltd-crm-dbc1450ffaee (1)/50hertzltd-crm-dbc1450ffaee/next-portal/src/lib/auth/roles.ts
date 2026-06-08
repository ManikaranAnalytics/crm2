export type RoleName = string;

export const ROLE_HIERARCHY: RoleName[] = ['ADMIN', 'GM', 'MANAGER', 'EMPLOYEE'];

// All CRM users should be able to add queries, so include EMPLOYEE here as well.
export const CAN_MANAGE_QUERIES: RoleName[] = ['ADMIN', 'GM', 'MANAGER', 'EMPLOYEE'];

export const CAN_MANAGE_CLIENTS: RoleName[] = ['ADMIN', 'GM'];

