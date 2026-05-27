// lib/payload-access.ts — shared Payload access helpers (env-only, safe in payload.config)
import type { Access, PayloadRequest } from 'payload';
import { isAdminEmail } from '@/lib/admin-emails';

export function isPayloadAdminUser(user: PayloadRequest['user']): boolean {
  if (!user || typeof user !== 'object') return false;
  const email = 'email' in user ? user.email : null;
  return isAdminEmail(typeof email === 'string' ? email : null);
}

export const payloadAdminAccess: Access = ({ req: { user } }) =>
  isPayloadAdminUser(user);

export const payloadPublicReadAdminWrite = {
  read: () => true,
  create: payloadAdminAccess,
  update: payloadAdminAccess,
  delete: payloadAdminAccess,
} as const;
