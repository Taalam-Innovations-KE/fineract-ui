import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetGlobalConfigurationsResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/configurations
 * Fetches global configurations
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.configurations}?${queryString}`
			: FINERACT_ENDPOINTS.configurations;

		const configurations = await fineractFetch<GetGlobalConfigurationsResponse>(
			path,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(configurations);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
