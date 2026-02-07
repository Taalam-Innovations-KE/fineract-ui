import "server-only";
import {
	getAccessToken,
	getSession,
	getUserCredentials,
} from "@/lib/auth/session";

/**
 * Server-side Fineract client
 * This file can only be imported in server components and API routes
 */

const FINERACT_BASE_URL =
	process.env.FINERACT_BASE_URL ||
	"https://demo.fineract.dev/fineract-provider/api";
const FINERACT_USERNAME = process.env.FINERACT_USERNAME || "mifos";
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || "password";

interface FineractRequestOptions {
	method?: string;
	body?: unknown;
	tenantId?: string; // Made optional - will use session tenantId if not provided
	headers?: Record<string, string>;
	useBasicAuth?: boolean; // Optional flag to use basic auth instead of bearer token
}

/**
 * Makes authenticated requests to Fineract API
 * Automatically detects authentication method based on session:
 * - For Keycloak provider: Uses Bearer token
 * - For Credentials provider: Uses Basic auth with user's credentials
 * - Fallback: Uses service-level basic auth from environment variables
 */
export async function fineractFetch<T = unknown>(
	path: string,
	options: FineractRequestOptions,
): Promise<T> {
	const { method = "GET", body, headers = {}, useBasicAuth = false } = options;

	let authHeader: string;
	let tenantId = options.tenantId;

	if (useBasicAuth) {
		// Use Basic Auth for service-level operations
		const basicAuth = Buffer.from(
			`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
		).toString("base64");
		authHeader = `Basic ${basicAuth}`;
		tenantId = tenantId || "default";
	} else {
		// Get session to determine authentication method
		const session = await getSession();

		if (session?.provider === "keycloak" && session?.accessToken) {
			// Use Keycloak Bearer token
			authHeader = `Bearer ${session.accessToken}`;
			tenantId = tenantId || session.tenantId || "default";
		} else if (session?.provider === "credentials" && session?.credentials) {
			// Use user's credentials with Basic Auth
			// The credentials are stored as base64-encoded username:password in the JWT
			authHeader = `Basic ${session.credentials}`;
			tenantId = tenantId || session.tenantId || "default";
		} else {
			// Fallback to service-level basic auth
			console.warn(
				"No session found or unknown provider, using service-level auth",
			);
			const basicAuth = Buffer.from(
				`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
			).toString("base64");
			authHeader = `Basic ${basicAuth}`;
			tenantId = tenantId || "default";
		}
	}

	const requestHeaders: HeadersInit = {
		"Content-Type": "application/json",
		Authorization: authHeader,
		"fineract-platform-tenantid": tenantId,
		...headers,
	};

	const requestInit: RequestInit = {
		method,
		headers: requestHeaders,
		cache: "no-store", // Always fetch fresh data for admin operations
	};

	if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
		requestInit.body = JSON.stringify(body);
	}

	const url = `${FINERACT_BASE_URL}${path}`;

	const response = await fetch(url, requestInit);

	// Handle non-JSON and empty responses safely.
	if (response.status === 204) {
		return null as T;
	}

	const rawBody = await response.text();
	let data: unknown = null;
	if (rawBody) {
		try {
			data = JSON.parse(rawBody);
		} catch {
			data = { message: rawBody };
		}
	}

	if (!response.ok) {
		if (data && typeof data === "object") {
			throw {
				...(data as Record<string, unknown>),
				httpStatusCode: response.status,
				statusText: response.statusText,
			};
		}

		throw {
			message: response.statusText || "Request failed",
			httpStatusCode: response.status,
			statusText: response.statusText,
		};
	}

	return data as T;
}

/**
 * Validates tenant ID header from request
 */
export function getTenantFromRequest(request: Request): string {
	// Check for tenant ID in different header formats
	const tenantId =
		request.headers.get("x-tenant-id") ||
		request.headers.get("fineract-platform-tenantid") ||
		request.headers.get("X-Tenant-Id");

	if (!tenantId) {
		throw new Error("Missing tenant ID header");
	}

	return tenantId;
}
