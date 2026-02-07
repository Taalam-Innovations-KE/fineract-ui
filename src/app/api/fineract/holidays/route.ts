import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetHolidaysResponse,
	PostHolidaysRequest,
	PostHolidaysResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/holidays
 * Fetches holidays with optional query filters
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.holidays}?${queryString}`
			: FINERACT_ENDPOINTS.holidays;

		const holidays = await fineractFetch<GetHolidaysResponse[]>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(holidays);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/holidays
 * Creates a new holiday
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostHolidaysRequest;

		const result = await fineractFetch<PostHolidaysResponse>(
			FINERACT_ENDPOINTS.holidays,
			{
				method: "POST",
				body,
				tenantId,
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
