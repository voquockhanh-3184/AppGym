import { isAdmin } from '../auth/helpers';

export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) {
    throw new Error('FORBIDDEN: Chỉ Admin mới được thực hiện thao tác này.');
  }
}
