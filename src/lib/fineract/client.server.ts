import "server-only";
import { getSession } from "@/lib/auth/session";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

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

type ResolvedRequestContext = {
	authHeader: string;
	tenantId: string;
};

async function resolveRequestContext(
	options: FineractRequestOptions,
): Promise<ResolvedRequestContext> {
	const { tenantId: providedTenantId, useBasicAuth = false } = options;

	let authHeader: string;
	let tenantId = providedTenantId;

	if (useBasicAuth) {
		const basicAuth = Buffer.from(
			`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
		).toString("base64");
		authHeader = `Basic ${basicAuth}`;
		tenantId = tenantId || "default";
	} else {
		const session = await getSession();

		if (session?.provider === "keycloak" && session?.accessToken) {
			authHeader = `Bearer ${session.accessToken}`;
			tenantId = tenantId || session.tenantId || "default";
		} else if (session?.provider === "credentials" && session?.credentials) {
			authHeader = `Basic ${session.credentials}`;
			tenantId = tenantId || session.tenantId || "default";
		} else {
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

	return {
		authHeader,
		tenantId: tenantId || "default",
	};
}

function buildRequestInit(
	method: string,
	authHeader: string,
	tenantId: string,
	headers: Record<string, string>,
	body: unknown,
): RequestInit {
	const requestHeaders: Record<string, string> = {
		Authorization: authHeader,
		"fineract-platform-tenantid": tenantId,
		...headers,
	};

	if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
		requestHeaders["Content-Type"] =
			requestHeaders["Content-Type"] || "application/json";
	}

	const requestInit: RequestInit = {
		method,
		headers: requestHeaders,
		cache: "no-store",
	};

	if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
		requestInit.body = JSON.stringify(body);
	}

	return requestInit;
}

export async function fineractFetchResponse(
	path: string,
	options: FineractRequestOptions,
): Promise<Response> {
	const { method = "GET", body, headers = {} } = options;
	const { authHeader, tenantId } = await resolveRequestContext(options);
	const requestInit = buildRequestInit(
		method,
		authHeader,
		tenantId,
		headers,
		body,
	);

	return fetch(`${FINERACT_BASE_URL}${path}`, requestInit);
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
	const response = await fineractFetchResponse(path, options);

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
		throw normalizeApiError({
			status: response.status,
			data: data ?? rawBody,
			headers: response.headers,
			message: response.statusText || "Request failed",
		});
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
