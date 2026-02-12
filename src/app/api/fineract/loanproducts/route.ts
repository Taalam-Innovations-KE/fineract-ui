import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { PostLoanProductsRequest } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/loanproducts
 * Fetches all loan products
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const searchParams = request.nextUrl.searchParams;
		const queryString = searchParams.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.loanProducts}?${queryString}`
			: FINERACT_ENDPOINTS.loanProducts;

		const products = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		const hasPaginationQuery =
			searchParams.has("offset") || searchParams.has("limit");
		if (hasPaginationQuery && Array.isArray(products)) {
			const offsetRaw = Number.parseInt(searchParams.get("offset") || "0", 10);
			const limitRaw = Number.parseInt(
				searchParams.get("limit") || String(products.length),
				10,
			);
			const offset = Number.isNaN(offsetRaw) ? 0 : Math.max(0, offsetRaw);
			const limit = Number.isNaN(limitRaw)
				? products.length
				: Math.max(-1, limitRaw);

			const pageItems =
				limit <= 0
					? products.slice(offset)
					: products.slice(offset, offset + limit);

			return NextResponse.json({
				totalFilteredRecords: products.length,
				pageItems,
			});
		}

		return NextResponse.json(products);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/loanproducts
 * Creates a new loan product
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as PostLoanProductsRequest;

		const result = await fineractFetch(FINERACT_ENDPOINTS.loanProducts, {
			method: "POST",
			body,
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
