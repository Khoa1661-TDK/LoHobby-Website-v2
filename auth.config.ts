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
    jwt({ token, user, account, profile }) {
      if (user?.email && typeof user.email === 'string') {
        token.email = user.email.trim().toLowerCase();
      } else if (
        account &&
        profile &&
        'email' in profile &&
        typeof profile.email === 'string'
      ) {
        token.email = profile.email.trim().toLowerCase();
      }
      if (user && typeof user.id === 'string') {
        (token as { id?: string }).id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      const tokenId = (token as { id?: string }).id;
      if (typeof tokenId === 'string' && session.user) {
        session.user.id = tokenId;
      }
      if (typeof token.email === 'string' && session.user) {
        session.user.email = token.email;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
