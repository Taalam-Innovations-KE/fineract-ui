import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	PutCodeValueDataResponse,
	PutCodeValuesDataRequest,
} from "@/lib/fineract/generated/types.gen";

interface RouteContext {
	params: {
		codeId: string;
		codeValueId: string;
	};
}

/**
 * PUT /api/fineract/codes/{codeId}/codevalues/{codeValueId}
 * Updates a code value
 */
export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId, codeValueId } = context.params;
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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
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
		const { codeId, codeValueId } = context.params;

		const result = await fineractFetch(
			`${FINERACT_ENDPOINTS.codes}/${codeId}/codevalues/${codeValueId}`,
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
