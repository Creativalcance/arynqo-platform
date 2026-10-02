export function duplicateRegistration(data: { user?: { identities?: unknown[] } | null }, error: { code?: string; message?: string } | null) {
  return error?.code === 'user_already_exists' || error?.code === 'email_exists'
    || /already registered|already been registered/i.test(error?.message || '')
    || (!error && Array.isArray(data.user?.identities) && data.user.identities.length === 0);
}
