import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { TaxGroupData } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/taxes/group/template
 * Fetches tax group template options.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const template = await fineractFetch<TaxGroupData>(
			FINERACT_ENDPOINTS.taxGroupTemplate,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
