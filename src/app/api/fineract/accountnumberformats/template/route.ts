import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetAccountNumberFormatsResponseTemplate } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/accountnumberformats/template
 * Fetches account number format template data
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const template =
			await fineractFetch<GetAccountNumberFormatsResponseTemplate>(
				FINERACT_ENDPOINTS.accountNumberFormatsTemplate,
				{
					method: "GET",
					tenantId,
				},
			);

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
