import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	DeleteDelinquencyRangeResponse,
	DelinquencyRangeData,
	DelinquencyRangeRequest,
	PutDelinquencyRangeResponse,
} from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: Promise<{
		delinquencyRangeId: string;
	}>;
}

/**
 * GET /api/fineract/delinquency/ranges/[delinquencyRangeId]
 * Fetches a delinquency range by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyRangeId } = await context.params;

		const range = await fineractFetch<DelinquencyRangeData>(
			`${FINERACT_ENDPOINTS.delinquencyRanges}/${delinquencyRangeId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(range);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/delinquency/ranges/[delinquencyRangeId]
 * Updates a delinquency range
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyRangeId } = await context.params;
		const body = (await request.json()) as DelinquencyRangeRequest;

		const result = await fineractFetch<PutDelinquencyRangeResponse>(
			`${FINERACT_ENDPOINTS.delinquencyRanges}/${delinquencyRangeId}`,
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
 * DELETE /api/fineract/delinquency/ranges/[delinquencyRangeId]
 * Deletes a delinquency range
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { delinquencyRangeId } = await context.params;

		const result = await fineractFetch<DeleteDelinquencyRangeResponse>(
			`${FINERACT_ENDPOINTS.delinquencyRanges}/${delinquencyRangeId}`,
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
