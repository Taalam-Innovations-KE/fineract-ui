import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetTaxesGroupResponse,
	PostTaxesGroupRequest,
	PostTaxesGroupResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/taxes/group
 * Fetches all tax groups.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const groups = await fineractFetch<GetTaxesGroupResponse[]>(
			FINERACT_ENDPOINTS.taxGroups,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(groups);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/taxes/group
 * Creates a tax group.
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostTaxesGroupRequest;

		const result = await fineractFetch<PostTaxesGroupResponse>(
			FINERACT_ENDPOINTS.taxGroups,
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
