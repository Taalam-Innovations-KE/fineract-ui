import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetLoanProductsProductIdResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/loanproducts/[id]
 * Fetches a single loan product by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const product = await fineractFetch<GetLoanProductsProductIdResponse>(
			`${FINERACT_ENDPOINTS.loanProducts}/${id}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(product);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
