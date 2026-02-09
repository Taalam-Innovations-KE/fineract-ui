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
	PostAccountingRulesResponse,
} from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/accountingrules
 * Fetches all accounting rules
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const rules = await fineractFetch<AccountingRuleData[]>(
			FINERACT_ENDPOINTS.accountingRules,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(rules);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/accountingrules
 * Creates an accounting rule
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as AccountRuleRequest;

		const result = await fineractFetch<PostAccountingRulesResponse>(
			FINERACT_ENDPOINTS.accountingRules,
			{
				method: "POST",
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
