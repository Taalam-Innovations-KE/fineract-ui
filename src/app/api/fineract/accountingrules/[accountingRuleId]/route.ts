import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	AccountingRuleData,
	AccountRuleRequest,
	DeleteAccountingRulesResponse,
	PutAccountingRulesResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/accountingrules/[accountingRuleId]
 * Fetches an accounting rule by id
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ accountingRuleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountingRuleId } = await params;

		const rule = await fineractFetch<AccountingRuleData>(
			FINERACT_ENDPOINTS.accountingRuleById(accountingRuleId),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(rule);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * PUT /api/fineract/accountingrules/[accountingRuleId]
 * Updates an accounting rule
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ accountingRuleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountingRuleId } = await params;
		const body = (await request.json()) as AccountRuleRequest;

		const result = await fineractFetch<PutAccountingRulesResponse>(
			FINERACT_ENDPOINTS.accountingRuleById(accountingRuleId),
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

/**
 * DELETE /api/fineract/accountingrules/[accountingRuleId]
 * Deletes an accounting rule
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ accountingRuleId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { accountingRuleId } = await params;

		const result = await fineractFetch<DeleteAccountingRulesResponse>(
			FINERACT_ENDPOINTS.accountingRuleById(accountingRuleId),
			{
				method: "DELETE",
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
