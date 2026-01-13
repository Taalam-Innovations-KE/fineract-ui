import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";

type ExtendedProfile = {
	email?: string | null;
	name?: string | null;
	roles?: string[];
};

type ExtendedUser = {
	email?: string | null;
	name?: string | null;
	username?: string;
	roles?: string[];
	tenantId?: string;
	credentials?: string;
};

/**
 * Authenticate user against Fineract API using basic auth
 */
async function authenticateWithFineract(
	username: string,
	password: string,
	tenantId: string = "default",
) {
	const FINERACT_BASE_URL =
		process.env.FINERACT_BASE_URL ||
		"https://demo.fineract.dev/fineract-provider/api";

	try {
		const authHeader = Buffer.from(`${username}:${password}`).toString(
			"base64",
		);

		// Try to authenticate by fetching user data
		const response = await fetch(`${FINERACT_BASE_URL}/v1/self/user`, {
			method: "GET",
			headers: {
				Authorization: `Basic ${authHeader}`,
				"fineract-platform-tenantid": tenantId,
				"Content-Type": "application/json",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			return null;
		}

		const userData = await response.json();

		return {
			id: userData.userId?.toString() || username,
			username: userData.username || username,
			email: userData.email || `${username}@fineract.local`,
			name:
				`${userData.firstname || ""} ${userData.lastname || ""}`.trim() ||
				username,
			roles: userData.roles || [],
			tenantId,
		};
	} catch (error) {
		console.error("Fineract authentication error:", error);
		return null;
	}
}

export const authConfig: NextAuthConfig = {
	providers: [
		Credentials({
			id: "credentials",
			name: "Username & Password",
			credentials: {
				username: { label: "Username", type: "text" },
				password: { label: "Password", type: "password" },
				tenantId: { label: "Tenant ID", type: "text" },
			},
			async authorize(credentials) {
				if (!credentials?.username || !credentials?.password) {
					return null;
				}

				const user = await authenticateWithFineract(
					credentials.username as string,
					credentials.password as string,
					(credentials.tenantId as string) || "default",
				);

				// Store credentials securely in the user object (will be encrypted in JWT)
				if (user) {
					return {
						...user,
						credentials: Buffer.from(
							`${credentials.username}:${credentials.password}`,
						).toString("base64"),
					};
				}

				return user;
			},
		}),
		Keycloak({
			clientId: process.env.AUTH_KEYCLOAK_ID!,
			clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
			issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
		}),
	],
	callbacks: {
		async jwt({ token, account, profile, user }) {
			// For Keycloak provider
			if (account?.provider === "keycloak") {
				token.accessToken = account.access_token;
				token.idToken = account.id_token;
				token.refreshToken = account.refresh_token;
				token.expiresAt = account.expires_at;
				token.provider = "keycloak";

				if (profile) {
					token.email = profile.email;
					token.name = profile.name;
					token.roles = (profile as ExtendedProfile).roles || [];
				}
			}

			// For Credentials provider
			if (account?.provider === "credentials" && user) {
				token.username = (user as ExtendedUser).username;
				token.email = user.email;
				token.name = user.name;
				token.roles = (user as ExtendedUser).roles || [];
				token.tenantId = (user as ExtendedUser).tenantId || "default";
				token.provider = "credentials";
				// Store password hash or encrypted password in token (JWT is already encrypted)
				// This is necessary for Fineract basic auth which requires username:password
				token.credentials = (user as ExtendedUser).credentials;
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
				session.provider = token.provider as string;
				session.username = token.username as string;
				session.tenantId = token.tenantId as string;
				session.credentials = token.credentials as string;

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
			const isOnAdminPage = request.nextUrl.pathname.startsWith("/config");
			const isOnLoginPage = request.nextUrl.pathname.startsWith("/auth/signin");

			if (isOnAdminPage) {
				if (!isLoggedIn) return false;
				return true;
			}

			if (isLoggedIn && isOnLoginPage) {
				return Response.redirect(new URL("/config", request.nextUrl));
			}

			return true;
		},
	},
	pages: {
		signIn: "/auth/signin",
		error: "/auth/error",
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
