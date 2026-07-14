// src/payload/collections/Users.ts
import { APIError, type CollectionConfig } from 'payload';
import { isAdminEmail } from '@/lib/admin-emails';
import { isPayloadAdminUser } from '@/lib/payload-access';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'updatedAt'],
  },
  auth: true,
  access: {
    admin: ({ req: { user } }) => isPayloadAdminUser(user),
    create: ({ req, data }) => {
      const email =
        typeof data?.email === 'string'
          ? data.email
          : typeof req.user?.email === 'string'
            ? req.user.email
            : null;
      return isAdminEmail(email);
    },
    read: ({ req: { user } }) => isPayloadAdminUser(user),
    update: ({ req: { user } }) => isPayloadAdminUser(user),
    delete: ({ req: { user } }) => isPayloadAdminUser(user),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation !== 'create') return data;
        const email = typeof data?.email === 'string' ? data.email : '';
        if (!isAdminEmail(email)) {
          throw new APIError('Only administrator emails can create CMS accounts.', 403);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      // Per-user random salt mixed into `derivePayloadPassword` (see
      // lib/payload-admin-sync.ts). Narrows the blast radius of a leaked
      // PAYLOAD_SECRET/AUTH_SECRET: without this row's value, the secret
      // alone is no longer sufficient to compute an admin's derived
      // password. Nullable because existing rows predate this field — it is
      // generated lazily on next sync (same lazy-write pattern as name/
      // password sync in ensurePayloadAdminUser).
      name: 'ssoSalt',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
  ],
};
