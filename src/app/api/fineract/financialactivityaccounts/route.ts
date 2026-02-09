import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetFinancialActivityAccountsResponse,
	PostFinancialActivityAccountsRequest,
	PostFinancialActivityAccountsResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/financialactivityaccounts
 * Fetches financial activity account mappings
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const mappings = await fineractFetch<
			GetFinancialActivityAccountsResponse[]
		>(FINERACT_ENDPOINTS.financialActivityAccounts, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(mappings);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/financialactivityaccounts
 * Creates a financial activity account mapping
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostFinancialActivityAccountsRequest;

		const result = await fineractFetch<PostFinancialActivityAccountsResponse>(
			FINERACT_ENDPOINTS.financialActivityAccounts,
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
