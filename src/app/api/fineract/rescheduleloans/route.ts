import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetLoanProductsProductIdResponse,
	GetLoanRescheduleRequestResponse,
	GetLoansLoanIdResponse,
	PostCreateRescheduleLoansRequest,
} from "@/lib/fineract/generated/types.gen";
import { validationErrorResponse } from "@/lib/fineract/api-error-response";
import { validateRescheduleCreateRules } from "@/lib/fineract/loan-rule-validations";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

type PostCreateRescheduleLoansRequestExtended = PostCreateRescheduleLoansRequest & {
	emi?: number;
	endDate?: string;
	recalculateInterest?: boolean;
	rescheduleFromInstallment?: number;
};

/**
 * GET /api/fineract/rescheduleloans
 * Fetches reschedule loan requests with optional filters (loanId, command).
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.rescheduleLoans}?${queryString}`
			: FINERACT_ENDPOINTS.rescheduleLoans;

		const rescheduleRequests = await fineractFetch<
			Array<GetLoanRescheduleRequestResponse>
		>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(rescheduleRequests);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/rescheduleloans
 * Creates a loan reschedule request.
 * Supports optional command query passthrough (e.g. previewLoanReschedule).
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body =
			(await request.json()) as PostCreateRescheduleLoansRequestExtended;
		if (!body.loanId || body.loanId <= 0) {
			return validationErrorResponse("Restructure validation failed.", [
				{
					field: "loanId",
					message: "loanId is required and must be greater than zero.",
					code: "RESCHEDULE_LOAN_ID_REQUIRED",
				},
			]);
		}

		const loan = await fineractFetch<GetLoansLoanIdResponse>(
			`${FINERACT_ENDPOINTS.loans}/${body.loanId}?associations=repaymentSchedule,transactions,charges`,
			{
				method: "GET",
				tenantId,
			},
		);
		const loanProduct =
			typeof loan.loanProductId === "number"
				? await fineractFetch<GetLoanProductsProductIdResponse>(
						`${FINERACT_ENDPOINTS.loanProducts}/${loan.loanProductId}`,
						{
							method: "GET",
							tenantId,
						},
					)
				: null;

		const validationIssues = validateRescheduleCreateRules({
			payload: body,
			loan,
			loanProduct,
		});
		if (validationIssues.length > 0) {
			return validationErrorResponse(
				"Restructure validation failed.",
				validationIssues,
			);
		}

		const command = request.nextUrl.searchParams.get("command");
		const path = command
			? `${FINERACT_ENDPOINTS.rescheduleLoans}?command=${encodeURIComponent(command)}`
			: FINERACT_ENDPOINTS.rescheduleLoans;

		const result = await fineractFetch<unknown>(path, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
