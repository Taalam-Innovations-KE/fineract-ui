import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	PutCodeValueDataResponse,
	PutCodeValuesDataRequest,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

interface RouteContext {
	params: Promise<{
		codeId: string;
		codeValueId: string;
	}>;
}

/**
 * PUT /api/fineract/codes/{codeId}/codevalues/{codeValueId}
 * Updates a code value
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId, codeValueId } = await context.params;
		const body = (await request.json()) as PutCodeValuesDataRequest;

		const result = await fineractFetch<PutCodeValueDataResponse>(
			`${FINERACT_ENDPOINTS.codes}/${codeId}/codevalues/${codeValueId}`,
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
 * DELETE /api/fineract/codes/{codeId}/codevalues/{codeValueId}
 * Deletes a code value
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId, codeValueId } = await context.params;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.codes}/${codeId}/codevalues/${codeValueId}`,
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
