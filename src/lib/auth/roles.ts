export type RoleName = string;

export const ROLE_HIERARCHY: RoleName[] = ['ADMIN', 'MANAGER', 'KAM'];

// KAM users create queries; ADMIN and MANAGER retain existing access.
export const CAN_MANAGE_QUERIES: RoleName[] = ['ADMIN', 'MANAGER', 'KAM'];

export const CAN_MANAGE_CLIENTS: RoleName[] = ['ADMIN'];

