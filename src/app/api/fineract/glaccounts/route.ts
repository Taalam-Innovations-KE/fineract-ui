import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetGlAccountsResponse,
	PostGlAccountsRequest,
	PostGlAccountsResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/glaccounts
 * Fetches all GL accounts
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const searchParams = request.nextUrl.searchParams.toString();
		const path = searchParams
			? `${FINERACT_ENDPOINTS.glaccounts}?${searchParams}`
			: FINERACT_ENDPOINTS.glaccounts;

		const glaccounts = await fineractFetch<GetGlAccountsResponse[]>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(glaccounts);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/glaccounts
 * Creates a new GL account
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostGlAccountsRequest;

		const result = await fineractFetch<PostGlAccountsResponse>(
			FINERACT_ENDPOINTS.glaccounts,
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
