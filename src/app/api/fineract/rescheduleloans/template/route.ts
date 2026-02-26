import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetRescheduleReasonsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/rescheduleloans/template
 * Fetches reschedule loan reasons template.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const template =
			await fineractFetch<GetRescheduleReasonsTemplateResponse>(
				FINERACT_ENDPOINTS.rescheduleLoansTemplate,
				{
					method: "GET",
					tenantId,
				},
			);

		return NextResponse.json(template);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
