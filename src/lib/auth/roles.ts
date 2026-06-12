export type RoleName = string;

export const ROLE_HIERARCHY: RoleName[] = ['ADMIN', 'MANAGER', 'KAM'];

// KAM users create queries; ADMIN and MANAGER retain existing access.
export const CAN_MANAGE_QUERIES: RoleName[] = ['ADMIN', 'MANAGER', 'KAM'];

export const CAN_MANAGE_CLIENTS: RoleName[] = ['ADMIN'];

/** Default Queries nav target per role (sidebar + post-login). */
export function getDefaultQueriesRoute(role: RoleName): string {
  if (role === 'KAM') return '/queries/replies-inbox';
  return '/queries/assign';
}

/** Query Replies tab destination — same for all roles that can view replies. */
export function getRepliesInboxRoute(): string {
  return '/queries/replies-inbox';
}

