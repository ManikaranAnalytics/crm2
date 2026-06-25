/** Standalone email file helpers — safe to import from API routes and client code. */

export const EMAIL_FILE_EXTENSIONS = ['.msg', '.eml'] as const;
export const EMAIL_FILE_ACCEPT = '.msg,.eml';

export function isEmailFileName(fileName?: string): boolean {
  if (!fileName) return false;
  const pathOnly = fileName.split('?')[0].split('#')[0];
  const lower = pathOnly.toLowerCase();
  return lower.endsWith('.msg') || lower.endsWith('.eml');
}
