import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetGlAccountsTemplateResponse } from "@/lib/fineract/generated/types.gen";

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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
