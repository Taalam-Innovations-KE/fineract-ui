import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	PostLoansLoanIdRequest,
	PutLoansLoanIdRequest,
} from "@/lib/fineract/generated/types.gen";

interface LoanStatusSnapshot {
	status?: {
		pendingApproval?: boolean;
	};
}

function inferLoanCommand(body: PostLoansLoanIdRequest): string | null {
	if (body.approvedOnDate) {
		return "approve";
	}
	if (body.actualDisbursementDate) {
		return "disburse";
	}
	if (body.rejectedOnDate) {
		return "reject";
	}
	if (body.withdrawnOnDate) {
		return "withdraw";
	}
	if (body.toLoanOfficerId) {
		return "assignloanofficer";
	}
	if (body.fromLoanOfficerId) {
		return "unassignloanofficer";
	}
	return null;
}

/**
 * GET /api/fineract/loans/[loanId]
 * Fetches loan details
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;

		const searchParams = request.nextUrl.searchParams.toString();
		const path = `${FINERACT_ENDPOINTS.loans}/${loanId}${
			searchParams ? `?${searchParams}` : ""
		}`;

		const loan = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(loan);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/loans/[loanId]
 * Executes loan commands (approve, disburse, reject, withdraw, etc.)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const body = (await request.json()) as
			| PostLoansLoanIdRequest
			| PutLoansLoanIdRequest;
		const explicitCommand = request.nextUrl.searchParams.get("command");
		const inferredCommand = inferLoanCommand(body as PostLoansLoanIdRequest);
		const command = explicitCommand || inferredCommand;

		if (command) {
			const path = `${FINERACT_ENDPOINTS.loans}/${loanId}?command=${command}`;
			const transitionResult = await fineractFetch(path, {
				method: "POST", // Fineract uses POST for lifecycle transitions
				body,
				tenantId,
			});
			return NextResponse.json(transitionResult);
		}

		// Loan application updates are only valid while pending approval.
		const loanStatus = (await fineractFetch(
			`${FINERACT_ENDPOINTS.loans}/${loanId}?fields=status`,
			{
				method: "GET",
				tenantId,
			},
		)) as LoanStatusSnapshot;
		if (!loanStatus.status?.pendingApproval) {
			return NextResponse.json(
				{
					code: "LOAN_APPLICATION_EDIT_NOT_ALLOWED",
					message:
						"Loan application can only be edited while pending approval.",
					statusCode: 409,
				},
				{ status: 409 },
			);
		}

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
