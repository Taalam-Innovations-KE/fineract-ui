import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetLoansLoanIdTransactionsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

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
			return invalidRequestResponse("Invalid loan ID");
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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
