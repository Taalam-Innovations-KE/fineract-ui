import { NextRequest, NextResponse } from "next/server";
import type {
	AccountNumberFormatMutationRequest,
	AccountNumberFormatRecord,
} from "@/lib/fineract/account-number-formats";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/accountnumberformats
 * Fetches all account number formats
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const formats = await fineractFetch<AccountNumberFormatRecord[]>(
			FINERACT_ENDPOINTS.accountNumberFormats,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(formats);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/accountnumberformats
 * Creates a new account number format
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as AccountNumberFormatMutationRequest;

		const result = await fineractFetch(
			FINERACT_ENDPOINTS.accountNumberFormats,
			{
				method: "POST",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
