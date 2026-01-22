import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetLoansLoanIdResponse,
	PutLoansLoanIdRequest,
} from "@/lib/fineract/generated/types.gen";

type LoanRouteContext = {
	params: Promise<{ loanId: string }>;
};

/**
 * GET /api/fineract/loans/:loanId
 * Fetch loan details
 */
export async function GET(request: NextRequest, context: LoanRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await context.params;

		const loan = await fineractFetch<GetLoansLoanIdResponse>(
			`${FINERACT_ENDPOINTS.loans}/${loanId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(loan);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/loans/:loanId
 * Update a loan
 */
export async function PUT(request: NextRequest, context: LoanRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await context.params;
		const body = (await request.json()) as PutLoansLoanIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.loans}/${loanId}`,
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
