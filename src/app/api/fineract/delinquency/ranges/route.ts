import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DelinquencyRangeData,
	DelinquencyRangeRequest,
	PostDelinquencyRangeResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/delinquency/ranges
 * Fetches all delinquency ranges
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const ranges = await fineractFetch<DelinquencyRangeData[]>(
			FINERACT_ENDPOINTS.delinquencyRanges,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(ranges);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/delinquency/ranges
 * Creates a delinquency range
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as DelinquencyRangeRequest;

		const result = await fineractFetch<PostDelinquencyRangeResponse>(
			FINERACT_ENDPOINTS.delinquencyRanges,
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
