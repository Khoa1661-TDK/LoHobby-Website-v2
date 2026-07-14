// auth.ts
import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';

import { authConfig } from '@/auth.config';
import { autoVerifyGoogleUser } from '@/lib/auth-verify';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: { id: string; provider?: string } & DefaultSession['user'];
  }
}

const config = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'Đăng nhập',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials): Promise<{
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      } | null> {
        const rawEmail = credentials?.email;
        const rawPassword = credentials?.password;
        if (typeof rawEmail !== 'string' || typeof rawPassword !== 'string') return null;

        const email = rawEmail.trim().toLowerCase();
        if (!email || !rawPassword) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(rawPassword, user.password);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google' && typeof user.id === 'string') {
        await autoVerifyGoogleUser(user.id);
      }
      return true;
    },
    async jwt(params) {
      const token = authConfig.callbacks?.jwt
        ? await authConfig.callbacks.jwt(params)
        : params.token;

      // Re-hydrate profile fields from the database when missing or after
      // `session.update()` (e.g. profile save) so the navbar account menu stays
      // in sync with Prisma.
      const shouldRefresh = !token.email || params.trigger === 'update';
      if (shouldRefresh && typeof token.sub === 'string') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { email: true, name: true, image: true },
        });
        if (dbUser?.email) {
          token.email = dbUser.email.trim().toLowerCase();
        }
        if (dbUser) {
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }

      return token;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
