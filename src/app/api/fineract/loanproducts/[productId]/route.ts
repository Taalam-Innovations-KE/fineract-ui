import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetLoanProductsResponse,
	PutLoanProductsProductIdRequest,
} from "@/lib/fineract/generated/types.gen";

type LoanProductRouteContext = {
	params: Promise<{ productId: string }>;
};

/**
 * GET /api/fineract/loanproducts/:productId
 * Fetch loan product details
 */
export async function GET(
	request: NextRequest,
	context: LoanProductRouteContext,
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { productId } = await context.params;

		const product = await fineractFetch<GetLoanProductsResponse>(
			`${FINERACT_ENDPOINTS.loanProducts}/${productId}`,
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

/**
 * PUT /api/fineract/loanproducts/:productId
 * Update a loan product
 */
export async function PUT(
	request: NextRequest,
	context: LoanProductRouteContext,
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { productId } = await context.params;
		const body = (await request.json()) as PutLoanProductsProductIdRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.loanProducts}/${productId}`,
			{
				method: "PUT",
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
