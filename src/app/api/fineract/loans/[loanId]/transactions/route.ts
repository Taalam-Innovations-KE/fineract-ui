import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetLoansLoanIdTransactionsResponse,
	PostLoansLoanIdTransactionsRequest,
	PostLoansLoanIdTransactionsResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/loans/[loanId]/transactions
 * Fetches loan transactions with optional query parameters
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = Number.parseInt(loanId, 10);

		if (Number.isNaN(loanIdNum)) {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "Invalid loan ID",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}

		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loanTransactions(loanIdNum)}?${queryString}`
			: FINERACT_ENDPOINTS.loanTransactions(loanIdNum);

		const transactions =
			await fineractFetch<GetLoansLoanIdTransactionsResponse>(path, {
				method: "GET",
				tenantId,
			});

		return NextResponse.json(transactions);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/loans/[loanId]/transactions
 * Executes loan transactions (defaults to repayment command)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = Number.parseInt(loanId, 10);

		if (Number.isNaN(loanIdNum)) {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "Invalid loan ID",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}

		const body = (await request.json()) as PostLoansLoanIdTransactionsRequest;
		const command =
			request.nextUrl.searchParams.get("command")?.trim() || "repayment";

		const path = `${FINERACT_ENDPOINTS.loanTransactions(loanIdNum)}?command=${encodeURIComponent(command)}`;

		const result = await fineractFetch<PostLoansLoanIdTransactionsResponse>(
			path,
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
