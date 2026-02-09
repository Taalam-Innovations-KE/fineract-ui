import { NextRequest, NextResponse } from "next/server";
import { fineractFetch } from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	CurrencyConfigurationData,
	CurrencyUpdateRequest,
} from "@/lib/fineract/generated/types.gen";

function resolveTenantId(request: NextRequest): string {
	return (
		request.headers.get("x-tenant-id") ||
		request.headers.get("fineract-platform-tenantid") ||
		request.headers.get("X-Tenant-Id") ||
		"default"
	);
}

/**
 * GET /api/fineract/currencies
 * Fetches currency configuration (enabled and available currencies)
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = resolveTenantId(request);

		const currencies = await fineractFetch<CurrencyConfigurationData>(
			FINERACT_ENDPOINTS.currencies,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(currencies);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/currencies
 * Updates enabled currencies
 */
export async function PUT(request: NextRequest) {
	try {
		const tenantId = resolveTenantId(request);
		const body = (await request.json()) as CurrencyUpdateRequest;

		const result = await fineractFetch(FINERACT_ENDPOINTS.currencies, {
			method: "PUT",
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
