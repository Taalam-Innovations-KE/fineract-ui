import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetPaymentTypeData } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/paymenttypes
 * Fetches payment types for loan disbursements and other operations
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const paymentTypes = await fineractFetch<GetPaymentTypeData[]>(
			FINERACT_ENDPOINTS.paymentTypes,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(paymentTypes);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
