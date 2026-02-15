import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	DeleteGlAccountsResponse,
	GetGlAccountsResponse,
	PutGlAccountsRequest,
	PutGlAccountsResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/glaccounts/[glAccountId]
 * Fetches a single GL account
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ glAccountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glAccountId } = await params;
		const searchParams = request.nextUrl.searchParams.toString();
		const basePath = FINERACT_ENDPOINTS.glAccountById(glAccountId);
		const path = searchParams ? `${basePath}?${searchParams}` : basePath;

		const account = await fineractFetch<GetGlAccountsResponse>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(account);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/glaccounts/[glAccountId]
 * Updates a GL account
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ glAccountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glAccountId } = await params;
		const body = (await request.json()) as PutGlAccountsRequest;

		const result = await fineractFetch<PutGlAccountsResponse>(
			FINERACT_ENDPOINTS.glAccountById(glAccountId),
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
 * DELETE /api/fineract/glaccounts/[glAccountId]
 * Deletes a GL account
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ glAccountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { glAccountId } = await params;

		const result = await fineractFetch<DeleteGlAccountsResponse>(
			FINERACT_ENDPOINTS.glAccountById(glAccountId),
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
