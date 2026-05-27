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
          throw new APIError('Chỉ email quản trị viên mới có thể tạo tài khoản CMS.', 403);
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
  ],
};
