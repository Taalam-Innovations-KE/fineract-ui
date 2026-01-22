import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	RetrieveAuditSearchTemplate1Response,
	RetrieveCommandsResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/makercheckers
 * Get a list of entries that can be checked by the requestor
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { searchParams } = request.nextUrl;
		const pathname = request.nextUrl.pathname;

		// Check if it's the searchtemplate endpoint
		if (pathname.endsWith("/searchtemplate")) {
			const template =
				await fineractFetch<RetrieveAuditSearchTemplate1Response>(
					FINERACT_ENDPOINTS.makercheckersSearchTemplate,
					{
						method: "GET",
						tenantId,
					},
				);
			return NextResponse.json(template);
		}

		// Regular makercheckers list
		const queryString = searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.makercheckers}?${queryString}`
			: FINERACT_ENDPOINTS.makercheckers;

		const makercheckers = await fineractFetch<RetrieveCommandsResponse>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(makercheckers);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
