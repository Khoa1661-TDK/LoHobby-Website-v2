// auth.config.ts — edge-safe NextAuth config (no Prisma/bcrypt)
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { signIn: '/login' },
  callbacks: {
    /**
     * Single source of truth: `token.sub` is the user id (set by NextAuth on
     * initial signin), `token.email` is always the normalized email. Both are
     * preserved across refreshes because `user` is only defined on signin.
     */
    jwt({ token, user, profile, account }) {
      if (user && typeof user.id === 'string') {
        token.sub = user.id;
      }

      if (account?.provider) {
        token.provider = account.provider;
      }

      const nextEmail =
        (user && typeof user.email === 'string' && user.email) ||
        (profile && typeof (profile as { email?: unknown }).email === 'string'
          ? (profile as { email: string }).email
          : null);

      if (nextEmail) {
        token.email = nextEmail.trim().toLowerCase();
      }

      if (user) {
        if (typeof user.name === 'string') {
          token.name = user.name;
        } else if (user.name === null) {
          token.name = null;
        }
        if (typeof user.image === 'string') {
          token.picture = user.image;
        } else if (user.image === null) {
          token.picture = null;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === 'string') {
          session.user.id = token.sub;
        }
        if (typeof token.email === 'string') {
          session.user.email = token.email;
        }
        if (typeof token.name === 'string') {
          session.user.name = token.name;
        } else if (token.name === null) {
          session.user.name = null;
        }
        if (typeof token.picture === 'string') {
          session.user.image = token.picture;
        } else if (token.picture === null) {
          session.user.image = null;
        }
        // Sign-in provider ('google' | 'credentials') — used by getAdminUser()
        // to require Google sign-in for admin recognition, not just email match.
        session.user.provider = typeof token.provider === 'string' ? token.provider : undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
