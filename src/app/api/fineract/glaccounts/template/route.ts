import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetGlAccountsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/glaccounts/template
 * Fetches GL account template options
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const searchParams = request.nextUrl.searchParams.toString();
		const path = searchParams
			? `${FINERACT_ENDPOINTS.glAccountsTemplate}?${searchParams}`
			: FINERACT_ENDPOINTS.glAccountsTemplate;

		const template = await fineractFetch<GetGlAccountsTemplateResponse>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
