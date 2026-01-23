import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetCodesResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/codes/[codeId]
 * Fetches a single code by ID
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ codeId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId } = await params;

		const code = await fineractFetch<GetCodesResponse>(
			`${FINERACT_ENDPOINTS.codes}/${codeId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(code);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
