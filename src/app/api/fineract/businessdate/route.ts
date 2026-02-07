import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	BusinessDateUpdateRequest,
	BusinessDateUpdateResponse,
	GetBusinessDatesResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/businessdate
 * Fetches business dates
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const businessDates = await fineractFetch<GetBusinessDatesResponse>(
			FINERACT_ENDPOINTS.businessDate,
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(businessDates);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/businessdate
 * Updates a business date
 */
export async function PUT(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as BusinessDateUpdateRequest;

		const result = await fineractFetch<BusinessDateUpdateResponse>(
			FINERACT_ENDPOINTS.businessDate,
			{
				method: "PUT",
				body,
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
