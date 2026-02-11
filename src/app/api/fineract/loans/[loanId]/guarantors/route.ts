import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/[loanId]/guarantors
 * Fetches all guarantors for a loan
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = parseInt(loanId, 10);

		if (isNaN(loanIdNum)) {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "Invalid loan ID",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}

		const path = FINERACT_ENDPOINTS.loanGuarantors(loanIdNum);
		const guarantors = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(guarantors);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/loans/[loanId]/guarantors
 * Adds a new guarantor to a loan
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = parseInt(loanId, 10);

		if (isNaN(loanIdNum)) {
			return NextResponse.json(
				{
					code: "INVALID_REQUEST",
					message: "Invalid loan ID",
					statusCode: 400,
				},
				{ status: 400 },
			);
		}

		const body = await request.json();
		const path = FINERACT_ENDPOINTS.loanGuarantors(loanIdNum);

		const result = await fineractFetch(path, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
