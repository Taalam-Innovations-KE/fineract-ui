import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetPaymentTypeData,
	PaymentTypeRequest,
	PostPaymentTypesResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/paymenttypes
 * Fetches payment types for loan disbursements and other operations
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const onlyWithCode = request.nextUrl.searchParams.get("onlyWithCode");
		const endpoint =
			onlyWithCode !== null
				? `${FINERACT_ENDPOINTS.paymentTypes}?onlyWithCode=${encodeURIComponent(onlyWithCode)}`
				: FINERACT_ENDPOINTS.paymentTypes;

		const paymentTypes = await fineractFetch<GetPaymentTypeData[]>(endpoint, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(paymentTypes);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/paymenttypes
 * Creates a new payment type
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PaymentTypeRequest;

		const result = await fineractFetch<PostPaymentTypesResponse>(
			FINERACT_ENDPOINTS.paymentTypes,
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
