import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetAccountNumberFormatsIdResponse,
	PostAccountNumberFormatsRequest,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/accountnumberformats
 * Fetches all account number formats
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const formats = await fineractFetch<GetAccountNumberFormatsIdResponse[]>(
			FINERACT_ENDPOINTS.accountNumberFormats,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(formats);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
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
		const body = (await request.json()) as PostAccountNumberFormatsRequest;

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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
