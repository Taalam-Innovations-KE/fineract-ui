import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetReportsTemplateResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/reports/template
 * Fetches report template metadata (allowed parameters and report types)
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);

		const template = await fineractFetch<GetReportsTemplateResponse>(
			FINERACT_ENDPOINTS.reportTemplate,
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
