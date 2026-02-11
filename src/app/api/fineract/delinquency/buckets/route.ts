import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DelinquencyBucketData,
	DelinquencyBucketRequest,
	PostDelinquencyBucketResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/delinquency/buckets
 * Fetches all delinquency buckets
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const buckets = await fineractFetch<DelinquencyBucketData[]>(
			FINERACT_ENDPOINTS.delinquencyBuckets,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(buckets);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/delinquency/buckets
 * Creates a new delinquency bucket
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as DelinquencyBucketRequest;

		const result = await fineractFetch<PostDelinquencyBucketResponse>(
			FINERACT_ENDPOINTS.delinquencyBuckets,
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
