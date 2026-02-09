import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

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
 * POST /api/fineract/glaccounts/uploadtemplate
 * Uploads GL accounts template file
 */
export async function POST(request: NextRequest) {
	try {
		const { authorization, tenantId } = await resolveAuthHeaders(request);
		const formData = await request.formData();
		const uploadedFile =
			(formData.get("uploadedInputStream") as File | null) ||
			(formData.get("file") as File | null);
		const locale = (formData.get("locale") as string | null) || "en";
		const dateFormat =
			(formData.get("dateFormat") as string | null) || "dd MMMM yyyy";

		if (!uploadedFile) {
			return NextResponse.json(
				{ message: "Template file is required" },
				{ status: 400 },
			);
		}

		const fineractFormData = new FormData();
		fineractFormData.append("uploadedInputStream", uploadedFile);
		fineractFormData.append("locale", locale);
		fineractFormData.append("dateFormat", dateFormat);

		const response = await fetch(
			`${FINERACT_BASE_URL}${FINERACT_ENDPOINTS.glAccountsUploadTemplate}`,
			{
				method: "POST",
				headers: {
					Authorization: authorization,
					"fineract-platform-tenantid": tenantId,
				},
				body: fineractFormData,
				cache: "no-store",
			},
		);

		const responseText = await response.text();
		let parsedData: unknown = null;
		if (responseText) {
			try {
				parsedData = JSON.parse(responseText);
			} catch {
				parsedData = { message: responseText };
			}
		}

		if (!response.ok) {
			const mappedError = mapFineractError({
				...(typeof parsedData === "object" && parsedData ? parsedData : {}),
				httpStatusCode: response.status,
			});
			return NextResponse.json(mappedError, {
				status: mappedError.statusCode || response.status,
			});
		}

		return NextResponse.json(parsedData);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
