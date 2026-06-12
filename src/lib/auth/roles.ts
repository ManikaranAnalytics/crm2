export type RoleName = string;

export const ROLE_HIERARCHY: RoleName[] = ['ADMIN', 'GM', 'MANAGER', 'EMPLOYEE', 'KAM'];

// KAM users create queries; ADMIN/MANAGER/GM/EMPLOYEE retain existing access.
export const CAN_MANAGE_QUERIES: RoleName[] = ['ADMIN', 'GM', 'MANAGER', 'EMPLOYEE', 'KAM'];

export const CAN_MANAGE_CLIENTS: RoleName[] = ['ADMIN', 'GM'];

