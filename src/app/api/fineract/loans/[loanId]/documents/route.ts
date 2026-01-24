import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { FINERACT_ENDPOINTS } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";

/**
 * GET /api/fineract/loans/[loanId]/documents
 * Fetches all documents for a loan
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = parseInt(loanId, 10);

		if (isNaN(loanIdNum)) {
			return NextResponse.json({ message: "Invalid loan ID" }, { status: 400 });
		}

		const path = FINERACT_ENDPOINTS.loanDocuments(loanIdNum);
		const documents = await fineractFetch(path, {
			method: "GET",
			tenantId,
		});

		return NextResponse.json(documents);
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

/**
 * POST /api/fineract/loans/[loanId]/documents
 * Uploads a new document to a loan (multipart form data)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ loanId: string }> },
) {
	try {
		const tenantId = getTenantFromRequest(request);
		const { loanId } = await params;
		const loanIdNum = parseInt(loanId, 10);

		if (isNaN(loanIdNum)) {
			return NextResponse.json({ message: "Invalid loan ID" }, { status: 400 });
		}

		// Parse the multipart form data
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const name = formData.get("name") as string | null;
		const description = formData.get("description") as string | null;

		if (!file) {
			return NextResponse.json(
				{ message: "File is required" },
				{ status: 400 },
			);
		}

		if (!name) {
			return NextResponse.json(
				{ message: "Document name is required" },
				{ status: 400 },
			);
		}

		// Create FormData for Fineract API
		const fineractFormData = new FormData();
		fineractFormData.append("file", file);
		fineractFormData.append("name", name);
		if (description) {
			fineractFormData.append("description", description);
		}

		// Make request to Fineract
		const FINERACT_BASE_URL =
			process.env.FINERACT_BASE_URL ||
			"https://demo.fineract.dev/fineract-provider/api";
		const path = FINERACT_ENDPOINTS.loanDocuments(loanIdNum);
		const url = `${FINERACT_BASE_URL}${path}`;

		// Get auth credentials from session or environment
		const FINERACT_USERNAME = process.env.FINERACT_USERNAME || "mifos";
		const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || "password";
		const basicAuth = Buffer.from(
			`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
		).toString("base64");

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Basic ${basicAuth}`,
				"fineract-platform-tenantid": tenantId,
			},
			body: fineractFormData,
		});

		const data = await response.json();

		if (!response.ok) {
			const mappedError = mapFineractError({
				...data,
				httpStatusCode: response.status,
			});
			return NextResponse.json(mappedError, {
				status: mappedError.statusCode || 500,
			});
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}
