import { NextRequest, NextResponse } from "next/server";
import { invalidRequestResponse } from "@/lib/fineract/api-error-response";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/loans/[loanId]/collaterals
 * Fetches all collateral items for a loan
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
			return invalidRequestResponse("Invalid loan ID");
		}

		const path = FINERACT_ENDPOINTS.loanCollaterals(loanIdNum);
		const collaterals = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(collaterals);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/loans/[loanId]/collaterals
 * Adds a new collateral item to a loan
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
			return invalidRequestResponse("Invalid loan ID");
		}

		const body = await request.json();
		const path = FINERACT_ENDPOINTS.loanCollaterals(loanIdNum);

		const result = await fineractFetch(path, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
