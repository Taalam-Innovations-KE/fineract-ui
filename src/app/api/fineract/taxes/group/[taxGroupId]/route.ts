import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetTaxesGroupResponse,
	PutTaxesGroupTaxGroupIdRequest,
	PutTaxesGroupTaxGroupIdResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		taxGroupId: string;
	}>;
}

/**
 * GET /api/fineract/taxes/group/[taxGroupId]
 * Fetches a tax group by id. Supports template=true.
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { taxGroupId } = await context.params;
		const queryString = request.nextUrl.searchParams.toString();
		const basePath = FINERACT_ENDPOINTS.taxGroupById(taxGroupId);
		const path = queryString ? `${basePath}?${queryString}` : basePath;

		const group = await fineractFetch<GetTaxesGroupResponse>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(group);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/taxes/group/[taxGroupId]
 * Updates a tax group.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { taxGroupId } = await context.params;
		const body = (await request.json()) as PutTaxesGroupTaxGroupIdRequest;

		const result = await fineractFetch<PutTaxesGroupTaxGroupIdResponse>(
			FINERACT_ENDPOINTS.taxGroupById(taxGroupId),
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
