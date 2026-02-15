import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { GetReportsResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/reports
 * Fetches available reports from Fineract
 * Optionally filter by category (e.g., "Loan", "Client", "Savings")
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const category = request.nextUrl.searchParams.get("category");

		const reports = (await fineractFetch(FINERACT_ENDPOINTS.reports, {
			method: "GET",
			tenantId,
		})) as GetReportsResponse[];

		// Filter by category if provided (case-insensitive partial match)
		let filteredReports = reports;
		if (category) {
			const categoryLower = category.toLowerCase();
			filteredReports = reports.filter(
				(report) =>
					report.reportCategory?.toLowerCase().includes(categoryLower) ||
					report.reportName?.toLowerCase().includes(categoryLower),
			);
		}

		// Sort by report name for easier browsing
		filteredReports.sort((a, b) =>
			(a.reportName || "").localeCompare(b.reportName || ""),
		);

		return NextResponse.json(filteredReports);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
