import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetLoansLoanIdTransactionsTemplateResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/loans/[loanId]/transactions/template
 * Fetches a loan transaction template (defaults to repayment template)
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

		const query = new URLSearchParams(request.nextUrl.searchParams);
		if (!query.get("command")) {
			query.set("command", "repayment");
		}

		const queryString = query.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loanTransactionTemplate(loanIdNum)}?${queryString}`
			: FINERACT_ENDPOINTS.loanTransactionTemplate(loanIdNum);

		const template =
			await fineractFetch<GetLoansLoanIdTransactionsTemplateResponse>(path, {
				method: "GET",
				tenantId,
			});

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
