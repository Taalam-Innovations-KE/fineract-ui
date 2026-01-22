import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetGlAccountsResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/glaccounts
 * Fetches all GL accounts
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const glaccounts = await fineractFetch<GetGlAccountsResponse[]>(
			FINERACT_ENDPOINTS.glaccounts,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(glaccounts);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
