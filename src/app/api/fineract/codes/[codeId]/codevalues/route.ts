import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetCodeValuesDataResponse,
	PostCodeValueDataResponse,
	PostCodeValuesDataRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		codeId: string;
	}>;
}

/**
 * GET /api/fineract/codes/{codeId}/codevalues
 * Fetches code values for a code
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId } = await context.params;

		const result = await fineractFetch<GetCodeValuesDataResponse[]>(
			`${FINERACT_ENDPOINTS.codes}/${codeId}/codevalues`,
			{
				method: "GET",
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
 * POST /api/fineract/codes/{codeId}/codevalues
 * Creates a new code value
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId } = await context.params;
		const body = (await request.json()) as PostCodeValuesDataRequest;

		const result = await fineractFetch<PostCodeValueDataResponse>(
			`${FINERACT_ENDPOINTS.codes}/${codeId}/codevalues`,
			{
				method: "POST",
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
