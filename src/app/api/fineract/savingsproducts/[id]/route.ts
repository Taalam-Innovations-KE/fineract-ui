import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetSavingsProductsProductIdResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/savingsproducts/[id]
 * Fetches a single savings product by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const product = await fineractFetch<GetSavingsProductsProductIdResponse>(
			`${FINERACT_ENDPOINTS.savingsProducts}/${id}`,
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
 * PUT /api/fineract/savingsproducts/[id]
 * Updates a savings product by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;
		const body = (await request.json()) as Record<string, unknown>;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.savingsProducts}/${id}`,
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

/**
 * DELETE /api/fineract/savingsproducts/[id]
 * Deletes a savings product by ID
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.savingsProducts}/${id}`,
			{
				method: "DELETE",
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
