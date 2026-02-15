import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ journalEntryId: string }> },
) {
	try {
		const { journalEntryId } = await params;
		const tenantId = getTenantFromRequest(request);

		const entry = await fineractFetch<JournalEntryData>(
			`${FINERACT_ENDPOINTS.journalEntries}/${journalEntryId}`,
			{
				method: "GET",
				tenantId,
			},
		);

		return NextResponse.json(entry);
	} catch (error) {
		const mappedError = normalizeApiError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.httpStatus || 500,
		});
	}
}
