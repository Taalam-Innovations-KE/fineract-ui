import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetWorkingDaysTemplateResponse } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/workingdays/template
 * Fetches working days template options
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const template = await fineractFetch<GetWorkingDaysTemplateResponse>(
			`${FINERACT_ENDPOINTS.workingDays}/template`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
