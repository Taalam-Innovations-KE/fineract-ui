import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetTaxesComponentsResponse,
	PutTaxesComponentsTaxComponentIdRequest,
	PutTaxesComponentsTaxComponentIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		taxComponentId: string;
	}>;
}

/**
 * GET /api/fineract/taxes/component/[taxComponentId]
 * Fetches a tax component by id.
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { taxComponentId } = await context.params;

		const component = await fineractFetch<GetTaxesComponentsResponse>(
			FINERACT_ENDPOINTS.taxComponentById(taxComponentId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(component);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/taxes/component/[taxComponentId]
 * Updates a tax component.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { taxComponentId } = await context.params;
		const body =
			(await request.json()) as PutTaxesComponentsTaxComponentIdRequest;

		const result =
			await fineractFetch<PutTaxesComponentsTaxComponentIdResponse>(
				FINERACT_ENDPOINTS.taxComponentById(taxComponentId),
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
