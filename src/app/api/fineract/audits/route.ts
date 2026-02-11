import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

interface AuditListResponse {
	pageItems: unknown[];
	totalFilteredRecords: number;
}

/**
 * GET /api/fineract/audits
 * Fetches audit entries with optional filters and pagination.
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const params = new URLSearchParams(request.nextUrl.searchParams);

		// Keep audit view deterministic and include raw request payload for inspection.
		if (!params.has("orderBy")) params.set("orderBy", "madeOnDate");
		if (!params.has("sortOrder")) params.set("sortOrder", "DESC");
		if (!params.has("includeJson")) params.set("includeJson", "true");
		if ((params.has("offset") || params.has("limit")) && !params.has("paged")) {
			params.set("paged", "true");
		}

		const queryString = params.toString();
		const path = queryString
			? `${FINERACT_ENDPOINTS.audits}?${queryString}`
			: FINERACT_ENDPOINTS.audits;

		const audits = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(normalizeAuditResponse(audits));
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

function normalizeAuditResponse(payload: unknown): AuditListResponse {
	if (Array.isArray(payload)) {
		return {
			pageItems: payload,
			totalFilteredRecords: payload.length,
		};
	}

	if (!payload || typeof payload !== "object") {
		return { pageItems: [], totalFilteredRecords: 0 };
	}

	const obj = payload as {
		pageItems?: unknown[];
		events?: unknown[];
		totalFilteredRecords?: number;
	};

	const pageItems = Array.isArray(obj.pageItems)
		? obj.pageItems
		: Array.isArray(obj.events)
			? obj.events
			: [];

	return {
		pageItems,
		totalFilteredRecords:
			typeof obj.totalFilteredRecords === "number"
				? obj.totalFilteredRecords
				: pageItems.length,
	};
}
