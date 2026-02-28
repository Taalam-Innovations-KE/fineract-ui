import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

function normalizeAvailableExports(payload: unknown): string[] {
	if (Array.isArray(payload)) {
		return payload.filter(
			(value): value is string =>
				typeof value === "string" && value.trim().length > 0,
		);
	}

	if (
		payload &&
		typeof payload === "object" &&
		"allowedExports" in payload &&
		Array.isArray(payload.allowedExports)
	) {
		return payload.allowedExports.filter(
			(value): value is string =>
				typeof value === "string" && value.trim().length > 0,
		);
	}

	return [];
}

type RouteContext = {
	params: Promise<{
		reportName: string;
	}>;
};

export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { reportName } = await context.params;
		const decodedReportName = decodeURIComponent(reportName);
		const availableExports = await fineractFetch(
			FINERACT_ENDPOINTS.reportAvailableExports(decodedReportName),
			{
				method: "GET",
				tenantId,
				useBasicAuth: true,
			},
		);

		return NextResponse.json({
			reportName: decodedReportName,
			availableExports: normalizeAvailableExports(availableExports),
		});
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
