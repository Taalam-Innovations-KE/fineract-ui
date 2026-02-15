import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	BatchRequest,
	BatchResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * POST /api/fineract/batches
 * Executes a batch request payload against Fineract.
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const enclosingTransaction =
			request.nextUrl.searchParams.get("enclosingTransaction") === "true";
		const body = (await request.json()) as BatchRequest[];
		const endpoint = `${FINERACT_ENDPOINTS.batches}?enclosingTransaction=${enclosingTransaction}`;

		const result = await fineractFetch<BatchResponse[]>(endpoint, {
			method: "POST",
			tenantId,
			body,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
