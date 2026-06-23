export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}
