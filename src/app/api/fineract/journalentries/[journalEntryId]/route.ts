import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";

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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
