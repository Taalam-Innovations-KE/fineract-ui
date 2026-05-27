import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	PutSavingsAccountsAccountIdResponse,
	SavingsAccountData,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/savingsaccounts/[accountId]
 * Fetches savings account details.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ accountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = `${FINERACT_ENDPOINTS.savingsAccounts}/${accountId}${
			queryString ? `?${queryString}` : ""
		}`;

		const savingsAccount = await fineractFetch<SavingsAccountData>(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(savingsAccount);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * PUT /api/fineract/savingsaccounts/[accountId]
 * Updates savings account details or executes command-based account changes.
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ accountId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountId } = await params;
		const queryString = request.nextUrl.searchParams.toString();
		const path = `${FINERACT_ENDPOINTS.savingsAccounts}/${accountId}${
			queryString ? `?${queryString}` : ""
		}`;
		const body = (await request.json()) as Record<string, unknown>;

		const result = await fineractFetch<PutSavingsAccountsAccountIdResponse>(
			path,
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
