import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetTaxesComponentsResponse,
	PostTaxesComponentsRequest,
	PostTaxesComponentsResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/taxes/component
 * Fetches all tax components.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const components = await fineractFetch<GetTaxesComponentsResponse[]>(
			FINERACT_ENDPOINTS.taxComponents,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(components);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/taxes/component
 * Creates a tax component.
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostTaxesComponentsRequest;

		const result = await fineractFetch<PostTaxesComponentsResponse>(
			FINERACT_ENDPOINTS.taxComponents,
			{
				method: "POST",
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
