import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetChargesResponse,
	PutChargesChargeIdRequest,
	PutChargesChargeIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		chargeId: string;
	}>;
}

/**
 * GET /api/fineract/charges/[chargeId]
 * Fetches a charge by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { chargeId } = await context.params;

		const charge = await fineractFetch<GetChargesResponse>(
			FINERACT_ENDPOINTS.chargeById(chargeId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(charge);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/charges/[chargeId]
 * Updates a charge by ID
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { chargeId } = await context.params;
		const body = (await request.json()) as PutChargesChargeIdRequest;

		const result = await fineractFetch<PutChargesChargeIdResponse>(
			FINERACT_ENDPOINTS.chargeById(chargeId),
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
