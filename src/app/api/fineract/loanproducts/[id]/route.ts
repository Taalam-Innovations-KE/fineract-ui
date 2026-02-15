import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetLoanProductsProductIdResponse,
	PostLoanProductsRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

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
		const queryString = request.nextUrl.searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loanProducts}/${id}?${queryString}`
			: `${FINERACT_ENDPOINTS.loanProducts}/${id}`;

		const product = await fineractFetch<GetLoanProductsProductIdResponse>(
			path,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(product);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/loanproducts/[id]
 * Updates a single loan product by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;
		const body = (await request.json()) as PostLoanProductsRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.loanProducts}/${id}`,
			{
				method: "PUT",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result ?? {});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
