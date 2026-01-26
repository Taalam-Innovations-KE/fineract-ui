import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { mapFineractError } from "@/lib/fineract/error-mapping";

const FINERACT_BASE_URL =
	process.env.FINERACT_BASE_URL ||
	"https://demo.fineract.dev/fineract-provider/api";
const FINERACT_USERNAME = process.env.FINERACT_USERNAME || "mifos";
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD || "password";

/**
 * GET /api/fineract/reports/run/[reportName]
 * Runs a report and returns the output in the requested format
 *
 * Query parameters:
 * - output-type: PDF, XLS, CSV, HTML (default: PDF)
 * - R_loanId: Loan ID for loan-specific reports
 * - R_accountNo: Account number filter
 * - R_officeId: Office ID filter
 * - R_fromDate: Start date (yyyy-MM-dd)
 * - R_toDate: End date (yyyy-MM-dd)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ reportName: string }> },
) {
	try {
		const { reportName } = await params;

		// Get authentication - same pattern as fineractFetch
		let authHeader: string;
		let tenantId =
			request.headers.get("fineract-platform-tenantid") ||
			request.headers.get("x-tenant-id") ||
			"default";

		const session = await getSession();

		if (session?.provider === "keycloak" && session?.accessToken) {
			// Use Keycloak Bearer token
			authHeader = `Bearer ${session.accessToken}`;
			tenantId = tenantId || session.tenantId || "default";
		} else if (session?.provider === "credentials" && session?.credentials) {
			// Use user's credentials with Basic Auth
			authHeader = `Basic ${session.credentials}`;
			tenantId = tenantId || session.tenantId || "default";
		} else {
			// Fallback to service-level basic auth
			const basicAuth = Buffer.from(
				`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`,
			).toString("base64");
			authHeader = `Basic ${basicAuth}`;
		}

		// Build query parameters from request
		const searchParams = new URLSearchParams();
		const requestParams = request.nextUrl.searchParams;

		// Copy all query parameters
		requestParams.forEach((value, key) => {
			searchParams.append(key, value);
		});

		// Default to PDF if no output type specified
		if (!searchParams.has("output-type")) {
			searchParams.set("output-type", "PDF");
		}

		const outputType = searchParams.get("output-type") || "PDF";

		// Build the Fineract URL
		const encodedReportName = encodeURIComponent(reportName);
		const url = `${FINERACT_BASE_URL}/v1/runreports/${encodedReportName}?${searchParams.toString()}`;

		// Make request to Fineract
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: authHeader,
				"fineract-platform-tenantid": tenantId,
				Accept: getAcceptHeader(outputType),
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { message: errorText };
			}
			return NextResponse.json(
				{ error: errorData.message || "Failed to generate report" },
				{ status: response.status },
			);
		}

		// Get the response as a blob/buffer
		const data = await response.arrayBuffer();

		// Determine content type and filename
		const contentType = getContentType(outputType);
		const filename = `${reportName.replace(/\s+/g, "_")}_${Date.now()}.${getFileExtension(outputType)}`;

		// Return the file
		return new NextResponse(data, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Length": data.byteLength.toString(),
			},
		});
	} catch (error) {
		const mappedError = mapFineractError(error);
		return NextResponse.json(mappedError, {
			status: mappedError.statusCode || 500,
		});
	}
}

function getAcceptHeader(outputType: string): string {
	switch (outputType.toUpperCase()) {
		case "PDF":
			return "application/pdf";
		case "XLS":
			return "application/vnd.ms-excel";
		case "CSV":
			return "text/csv";
		case "HTML":
			return "text/html";
		default:
			return "application/pdf";
	}
}

function getContentType(outputType: string): string {
	switch (outputType.toUpperCase()) {
		case "PDF":
			return "application/pdf";
		case "XLS":
			return "application/vnd.ms-excel";
		case "CSV":
			return "text/csv";
		case "HTML":
			return "text/html";
		default:
			return "application/pdf";
	}
}

function getFileExtension(outputType: string): string {
	switch (outputType.toUpperCase()) {
		case "PDF":
			return "pdf";
		case "XLS":
			return "xls";
		case "CSV":
			return "csv";
		case "HTML":
			return "html";
		default:
			return "pdf";
	}
}
