import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetCodesResponse } from "@/lib/fineract/generated/types.gen";

type CodeRouteContext = {
	params: Promise<{ codeId: string }>;
};

/**
 * GET /api/fineract/codes/:codeId
 * Fetch a code
 */
export async function GET(request: NextRequest, context: CodeRouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { codeId } = await context.params;

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
