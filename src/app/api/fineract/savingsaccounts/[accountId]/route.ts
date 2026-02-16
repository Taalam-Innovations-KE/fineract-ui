import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { SavingsAccountData } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/savingsaccounts/[accountId]
 * Fetches savings account details.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ accountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = `${FINERACT_ENDPOINTS.savingsAccounts}/${accountId}${
			queryString ? `?${queryString}` : ""
		}`;

		const savingsAccount = await fineractFetch<SavingsAccountData>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(savingsAccount);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
