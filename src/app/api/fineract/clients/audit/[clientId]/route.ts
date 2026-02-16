import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/clients/audit/[clientId]
 * Fetches client audit trail from Fineract audits API.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ clientId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { clientId } = await params;

		const searchParams = new URLSearchParams({
			clientId,
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
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
