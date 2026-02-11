import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DeleteDelinquencyBucketResponse,
	DelinquencyBucketData,
	DelinquencyBucketRequest,
	PutDelinquencyBucketResponse,
} from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: Promise<{
		delinquencyBucketId: string;
	}>;
}

/**
 * GET /api/fineract/delinquency/buckets/[delinquencyBucketId]
 * Fetches a delinquency bucket by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyBucketId } = await context.params;

		const bucket = await fineractFetch<DelinquencyBucketData>(
			`${FINERACT_ENDPOINTS.delinquencyBuckets}/${delinquencyBucketId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(bucket);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/delinquency/buckets/[delinquencyBucketId]
 * Updates a delinquency bucket
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyBucketId } = await context.params;
		const body = (await request.json()) as DelinquencyBucketRequest;

		const result = await fineractFetch<PutDelinquencyBucketResponse>(
			`${FINERACT_ENDPOINTS.delinquencyBuckets}/${delinquencyBucketId}`,
			{
				method: "PUT",
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

/**
 * DELETE /api/fineract/delinquency/buckets/[delinquencyBucketId]
 * Deletes a delinquency bucket
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyBucketId } = await context.params;

		const result = await fineractFetch<DeleteDelinquencyBucketResponse>(
			`${FINERACT_ENDPOINTS.delinquencyBuckets}/${delinquencyBucketId}`,
			{
				method: "DELETE",
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
