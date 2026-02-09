import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { ReportExportType } from "@/lib/fineract/generated/types.gen";

/**
 * GET /api/fineract/reports/available-exports/[reportName]
 * Returns available backend export types for a report.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ reportName: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { reportName } = await params;

		const exports = await fineractFetch<ReportExportType[]>(
			FINERACT_ENDPOINTS.runReportsAvailableExports(reportName),
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(exports);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
