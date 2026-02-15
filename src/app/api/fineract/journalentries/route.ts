import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type {
	GetJournalEntriesTransactionIdResponse,
	JournalEntryCommand,
	PostJournalEntriesResponse,
} from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

/**
 * GET /api/fineract/journalentries
 * Fetches journal entries with optional filters
 */
export async function GET(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const url = new URL(request.url);
		const params = new URLSearchParams(url.search);

		const entries = await fineractFetch<GetJournalEntriesTransactionIdResponse>(
			`${FINERACT_ENDPOINTS.journalEntries}?${params}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(entries);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}

/**
 * POST /api/fineract/journalentries
 * Creates a new journal entry
 */
export async function POST(request: NextRequest) {
	try {
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as JournalEntryCommand;

		const result = await fineractFetch<PostJournalEntriesResponse>(
			FINERACT_ENDPOINTS.journalEntries,
			{
				method: "POST",
				body,
				tenantId,
			},
		);

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
