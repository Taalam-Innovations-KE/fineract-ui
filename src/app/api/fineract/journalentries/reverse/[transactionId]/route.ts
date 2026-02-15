import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import type { PostJournalEntriesTransactionIdResponse } from "@/lib/fineract/generated/types.gen";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ transactionId: string }> },
) {
	try {
		const { transactionId } = await params;
		const tenantId = getTenantFromRequest(request);
		const body = (await request.json()) as { officeId: number };

		const result = await fineractFetch<PostJournalEntriesTransactionIdResponse>(
			`${FINERACT_ENDPOINTS.journalEntries}/${transactionId}`,
			{
				method: "POST",
				body: { ...body, command: "reverse" },
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
