import "server-only";
import { auth } from "@/auth";

export async function getSession() {
	return await auth();
}

export async function getCurrentUser() {
	const session = await getSession();
	return session?.user;
}

export async function requireAuth() {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return session;
}

export async function getAccessToken() {
	const session = await getSession();

	if (!session?.accessToken) {
		throw new Error("No access token available");
	}

	return session.accessToken;
}

export async function getUserCredentials() {
	const session = await getSession();

	if (!session?.username) {
		throw new Error("No user credentials available");
	}

	return {
		username: session.username,
		tenantId: session.tenantId || "default",
	};
}

export function hasRole(
	session: { user?: { roles?: string[] } } | null,
	role: string,
): boolean {
	return session?.user?.roles?.includes(role) ?? false;
}

export function hasAnyRole(
	session: { user?: { roles?: string[] } } | null,
	roles: string[],
): boolean {
	return roles.some((role) => hasRole(session, role));
}
