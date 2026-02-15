import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

const FINERACT_BASE_URL =
	process.env.FINERACT_BASE_URL ||
	"https://demo.fineract.dev/fineract-provider/api";
const FINERACT_USERNAME = process.env.FINERACT_USERNAME || "mifos";
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || "password";

async function resolveAuthHeaders(request: NextRequest) {
	const tenantId =
		request.headers.get("x-tenant-id") ||
		request.headers.get("fineract-platform-tenantid") ||
		"default";

	const session = await getSession();
	if (session?.provider === "keycloak" && session?.accessToken) {
		return {
			authorization: `Bearer ${session.accessToken}`,
			tenantId: tenantId || session.tenantId || "default",
		};
	}

	if (session?.provider === "credentials" && session?.credentials) {
		return {
			authorization: `Basic ${session.credentials}`,
			tenantId: tenantId || session.tenantId || "default",
		};
	}

	const basicAuth = Buffer.from(
		`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
	).toString("base64");
	return {
		authorization: `Basic ${basicAuth}`,
		tenantId,
	};
}

/**
 * GET /api/fineract/glaccounts/downloadtemplate
 * Downloads GL accounts Excel template
 */
export async function GET(request: NextRequest) {
	try {
		const { authorization, tenantId } = await resolveAuthHeaders(request);
		const searchParams = request.nextUrl.searchParams.toString();
		const path = searchParams
			? `${FINERACT_ENDPOINTS.glAccountsDownloadTemplate}?${searchParams}`
			: FINERACT_ENDPOINTS.glAccountsDownloadTemplate;
		const url = `${FINERACT_BASE_URL}${path}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: authorization,
				"fineract-platform-tenantid": tenantId,
				Accept: "application/vnd.ms-excel",
			},
			cache: "no-store",
		});

		if (!response.ok) {
			const text = await response.text();
			let errorData: unknown;
			try {
				errorData = JSON.parse(text);
			} catch {
				errorData = { message: text || response.statusText };
			}
			const mappedError = normalizeApiError({
				status: response.status,
				data: errorData,
				headers: response.headers,
				message: response.statusText,
			});
			return NextResponse.json(mappedError, {
				status: mappedError.httpStatus || response.status,
			});
		}

		const data = await response.arrayBuffer();
		const filename =
			response.headers.get("content-disposition") ||
			`attachment; filename=\"glaccounts-template.xls\"`;

		return new NextResponse(data, {
			status: 200,
			headers: {
				"Content-Type":
					response.headers.get("content-type") || "application/vnd.ms-excel",
				"Content-Disposition": filename,
				"Content-Length": data.byteLength.toString(),
			},
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
