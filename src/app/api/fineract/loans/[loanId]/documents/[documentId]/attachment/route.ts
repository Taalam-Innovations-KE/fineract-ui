import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/[loanId]/documents/[documentId]/attachment
 * Downloads the actual document file
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

		const FINERACT_BASE_URL =
			process.env.FINERACT_BASE_URL ||
			"https://demo.fineract.dev/fineract-provider/api";
		const FINERACT_USERNAME = process.env.FINERACT_USERNAME || "mifos";
		const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || "password";

		const basicAuth = Buffer.from(
			`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
		).toString("base64");

		const path = `${FINERACT_ENDPOINTS.loanDocuments(loanIdNum)}/${documentIdNum}/attachment`;
		const url = `${FINERACT_BASE_URL}${path}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Basic ${basicAuth}`,
				"fineract-platform-tenantid": tenantId,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const mappedError = mapFineractError({
				...errorData,
				httpStatusCode: response.status,
			});
			return NextResponse.json(mappedError, {
				status: mappedError.statusCode || 500,
			});
		}

		// Get content type and disposition from original response
		const contentType =
			response.headers.get("content-type") || "application/octet-stream";
		const contentDisposition = response.headers.get("content-disposition");

		// Stream the file back
		const blob = await response.blob();

		const headers: HeadersInit = {
			"Content-Type": contentType,
		};

		if (contentDisposition) {
			headers["Content-Disposition"] = contentDisposition;
		}

		return new NextResponse(blob, { headers });
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
