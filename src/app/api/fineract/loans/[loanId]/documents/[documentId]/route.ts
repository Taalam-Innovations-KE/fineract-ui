import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/[loanId]/documents/[documentId]
 * Fetches a single document's metadata
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string; documentId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId, documentId } = await params;
		const loanIdNum = parseInt(loanId, 10);
		const documentIdNum = parseInt(documentId, 10);

		if (isNaN(loanIdNum) || isNaN(documentIdNum)) {
			return NextResponse.json(
				{ message: "Invalid loan ID or document ID" },
				{ status: 400 },
			);
		}

		const path = `${FINERACT_ENDPOINTS.loanDocuments(loanIdNum)}/${documentIdNum}`;
		const document = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(document);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * DELETE /api/fineract/loans/[loanId]/documents/[documentId]
 * Deletes a document from a loan
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string; documentId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId, documentId } = await params;
		const loanIdNum = parseInt(loanId, 10);
		const documentIdNum = parseInt(documentId, 10);

		if (isNaN(loanIdNum) || isNaN(documentIdNum)) {
			return NextResponse.json(
				{ message: "Invalid loan ID or document ID" },
				{ status: 400 },
			);
		}

		const path = `${FINERACT_ENDPOINTS.loanDocuments(loanIdNum)}/${documentIdNum}`;
		const result = await fineractFetch(path, {
			method: "DELETE",
			tenantId,
		});

		return NextResponse.json(result);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
