import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { PostJournalEntriesTransactionIdResponse } from "@/lib/fineract/generated/types.gen";

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
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
