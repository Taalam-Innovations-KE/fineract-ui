import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeReportParameterCatalog } from "@/lib/fineract/reports";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

const FULL_PARAMETER_LIST_QUERY = "parameterType=true&exportJSON=true";

export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const payload = await fineractFetch(
			`${FINERACT_ENDPOINTS.runReport("FullParameterList")}?${FULL_PARAMETER_LIST_QUERY}`,
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json(normalizeReportParameterCatalog(payload));
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
