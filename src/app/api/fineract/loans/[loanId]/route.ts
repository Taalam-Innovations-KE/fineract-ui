import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { PostLoansLoanIdRequest } from "@/lib/fineract/generated/types.gen";

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

		const path = `${FINERACT_ENDPOINTS.loans}/${loanId}`;

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
		const body = (await request.json()) as PostLoansLoanIdRequest;

		// Determine command based on body fields
		let command: string;
		if (body.approvedOnDate) {
			command = "approve";
		} else if (body.actualDisbursementDate) {
			command = "disburse";
		} else if (body.rejectedOnDate) {
			command = "reject";
		} else if (body.withdrawnOnDate) {
			command = "withdraw";
		} else if (body.toLoanOfficerId) {
			command = "assignloanofficer";
		} else if (body.fromLoanOfficerId) {
			command = "unassignloanofficer";
		} else {
			return NextResponse.json(
				{ message: "Invalid command: no recognized fields in request body" },
				{ status: 400 },
			);
		}

		const path = `${FINERACT_ENDPOINTS.loans}/${loanId}?command=${command}`;

		const result = await fineractFetch(path, {
			method: "POST", // Fineract uses POST for state transitions
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
