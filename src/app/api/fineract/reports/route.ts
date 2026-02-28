import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetReportsResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const reports = await fineractFetch<Array<GetReportsResponse>>(
			FINERACT_ENDPOINTS.reports,
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(reports);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
