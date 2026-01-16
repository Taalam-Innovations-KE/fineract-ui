import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetCodeValuesDataResponse,
	PostCodeValueDataResponse,
	PostCodeValuesDataRequest,
} from "@/lib/fineract/generated/types.gen";

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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
