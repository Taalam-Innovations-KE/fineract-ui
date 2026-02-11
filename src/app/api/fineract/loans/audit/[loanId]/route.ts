import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/audit/[loanId]
 * Fetches loan audit trail
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;

		// Use list audits filtered by loanId to retrieve the full audit trail.
		const searchParams = new URLSearchParams({
			loanId,
			orderBy: "madeOnDate",
			sortOrder: "DESC",
			limit: "200",
			includeJson: "true",
		});
		const path = `${FINERACT_ENDPOINTS.audits}?${searchParams.toString()}`;

		const audit = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		const events = Array.isArray(audit)
			? audit
			: typeof audit === "object" && audit !== null
				? Array.isArray((audit as { pageItems?: unknown[] }).pageItems)
					? ((audit as { pageItems: unknown[] }).pageItems ?? [])
					: Array.isArray((audit as { events?: unknown[] }).events)
						? ((audit as { events: unknown[] }).events ?? [])
						: []
				: [];

		return NextResponse.json({
			events,
			totalFilteredRecords:
				typeof audit === "object" &&
				audit !== null &&
				"totalFilteredRecords" in audit
					? (audit as { totalFilteredRecords?: number }).totalFilteredRecords
					: undefined,
		});
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
