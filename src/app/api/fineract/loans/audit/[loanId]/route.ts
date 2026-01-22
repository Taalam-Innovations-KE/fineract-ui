import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/audit/[loanId]
 * Fetches loan audit trail
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { loanId: string } },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = params;

		const path = `${FINERACT_ENDPOINTS.loans.replace("/v1/loans", "/v1/internal/loan")}/${loanId}/audit`;

		const audit = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(audit);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
