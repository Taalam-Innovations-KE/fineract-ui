import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { PostLoansRequest } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/loans
 * Fetches loans
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loans}?${queryString}`
			: FINERACT_ENDPOINTS.loans;

		const loans = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(loans);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/loans
 * Creates a new loan
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostLoansRequest;

		const result = await fineractFetch(FINERACT_ENDPOINTS.loans, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
