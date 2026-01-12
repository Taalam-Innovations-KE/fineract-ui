import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the access_token and id_token from Keycloak to the token
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Add custom user info from Keycloak profile
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.roles = (profile as any).roles || [];
      }

      return token;
    },
    async session({ session, token }) {
      // Add tokens and user info to the session
      if (token) {
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
        session.refreshToken = token.refreshToken as string;
        session.expiresAt = token.expiresAt as number;

        if (session.user) {
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.roles = token.roles as string[];
        }
      }

      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdminPage = request.nextUrl.pathname.startsWith('/config');
      const isOnLoginPage = request.nextUrl.pathname.startsWith('/auth/signin');

      if (isOnAdminPage) {
        if (!isLoggedIn) return false;
        return true;
      }

      if (isLoggedIn && isOnLoginPage) {
        return Response.redirect(new URL('/config', request.nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
