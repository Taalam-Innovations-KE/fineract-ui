import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetCodesResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/codes
 * Fetches all codes
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const codes = await fineractFetch<GetCodesResponse[]>(
			FINERACT_ENDPOINTS.codes,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(codes);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
