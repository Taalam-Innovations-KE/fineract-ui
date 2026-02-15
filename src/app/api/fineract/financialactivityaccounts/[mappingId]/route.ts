import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	DeleteFinancialActivityAccountsResponse,
	GetFinancialActivityAccountsResponse,
	PostFinancialActivityAccountsRequest,
	PutFinancialActivityAccountsResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/financialactivityaccounts/[mappingId]
 * Fetches a single financial activity mapping
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ mappingId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { mappingId } = await params;

		const mapping = await fineractFetch<GetFinancialActivityAccountsResponse>(
			FINERACT_ENDPOINTS.financialActivityAccountById(mappingId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(mapping);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/financialactivityaccounts/[mappingId]
 * Updates a financial activity mapping
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ mappingId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { mappingId } = await params;
		const body = (await request.json()) as PostFinancialActivityAccountsRequest;

		const result = await fineractFetch<PutFinancialActivityAccountsResponse>(
			FINERACT_ENDPOINTS.financialActivityAccountById(mappingId),
			{
				method: "PUT",
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

/**
 * DELETE /api/fineract/financialactivityaccounts/[mappingId]
 * Deletes a financial activity mapping
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ mappingId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { mappingId } = await params;

		const result = await fineractFetch<DeleteFinancialActivityAccountsResponse>(
			FINERACT_ENDPOINTS.financialActivityAccountById(mappingId),
			{
				method: "DELETE",
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
