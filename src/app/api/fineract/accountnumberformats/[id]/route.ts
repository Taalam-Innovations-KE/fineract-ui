import { NextRequest, NextResponse } from "next/server";
import type {
	AccountNumberFormatMutationRequest,
	AccountNumberFormatRecord,
} from "@/lib/fineract/account-number-formats";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/accountnumberformats/[id]
 * Fetches a specific account number format
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const format = await fineractFetch<AccountNumberFormatRecord>(
			`${FINERACT_ENDPOINTS.accountNumberFormats}/${id}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(format);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/accountnumberformats/[id]
 * Updates a specific account number format
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;
		const body = (await request.json()) as AccountNumberFormatMutationRequest;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.accountNumberFormats}/${id}`,
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
 * DELETE /api/fineract/accountnumberformats/[id]
 * Deletes a specific account number format
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { id } = await params;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.accountNumberFormats}/${id}`,
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
