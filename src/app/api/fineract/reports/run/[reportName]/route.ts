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
 * - output-type: PDF, XLS, XLSX, CSV, HTML (optional; omit for JSON resultset)
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

		const requestedOutputType = normalizeOutputType(
			searchParams.get("output-type"),
		);
		if (searchParams.has("output-type")) {
			searchParams.delete("output-type");
		}

		applyBackendExportQueryParams(searchParams, requestedOutputType);

		const outputType =
			requestedOutputType || inferOutputTypeFromQuery(searchParams);
		const shouldDownload = Boolean(outputType && outputType !== "JSON");

		// Build the Fineract URL
		const encodedReportName = encodeURIComponent(reportName);
		const url = `${FINERACT_BASE_URL}/v1/runreports/${encodedReportName}?${searchParams.toString()}`;

		// Make request to Fineract
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: authHeader,
				"fineract-platform-tenantid": tenantId,
				Accept: shouldDownload
					? getAcceptHeader(outputType)
					: "application/json",
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

		if (!shouldDownload) {
			const responseText = await response.text();
			if (!responseText) {
				return NextResponse.json({});
			}

			try {
				return NextResponse.json(JSON.parse(responseText));
			} catch {
				return new NextResponse(responseText, {
					status: 200,
					headers: {
						"Content-Type":
							response.headers.get("Content-Type") || "application/json",
					},
				});
			}
		}

		// Get the response as a blob/buffer
		const data = await response.arrayBuffer();

		// Determine content type and filename
		const contentType =
			response.headers.get("Content-Type") || getContentType(outputType);
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

function getAcceptHeader(outputType: string | null): string {
	if (!outputType) {
		return "application/json";
	}

	switch (outputType.toUpperCase()) {
		case "JSON":
			return "application/json";
		case "PDF":
			return "application/pdf";
		case "XLS":
			return "application/vnd.ms-excel";
		case "XLSX":
			return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		case "CSV":
			return "text/csv";
		case "HTML":
			return "text/html";
		default:
			return "application/pdf";
	}
}

function getContentType(outputType: string | null): string {
	if (!outputType) {
		return "application/json";
	}

	switch (outputType.toUpperCase()) {
		case "JSON":
			return "application/json";
		case "PDF":
			return "application/pdf";
		case "XLS":
			return "application/vnd.ms-excel";
		case "XLSX":
			return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		case "CSV":
			return "text/csv";
		case "HTML":
			return "text/html";
		default:
			return "application/pdf";
	}
}

function getFileExtension(outputType: string | null): string {
	if (!outputType) {
		return "json";
	}

	switch (outputType.toUpperCase()) {
		case "PDF":
			return "pdf";
		case "XLS":
			return "xls";
		case "XLSX":
			return "xlsx";
		case "CSV":
			return "csv";
		case "HTML":
			return "html";
		default:
			return "pdf";
	}
}

function normalizeOutputType(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const upper = value.toUpperCase();
	if (
		upper === "JSON" ||
		upper === "PDF" ||
		upper === "XLS" ||
		upper === "XLSX" ||
		upper === "CSV" ||
		upper === "HTML"
	) {
		return upper;
	}

	return null;
}

function isTrue(value: string | null): boolean {
	return value?.toLowerCase() === "true";
}

function inferOutputTypeFromQuery(
	searchParams: URLSearchParams,
): string | null {
	if (isTrue(searchParams.get("exportCSV"))) return "CSV";
	if (isTrue(searchParams.get("exportPDF"))) return "PDF";
	if (isTrue(searchParams.get("exportXLSX"))) return "XLSX";
	if (isTrue(searchParams.get("exportXLS"))) return "XLS";
	if (isTrue(searchParams.get("exportHTML"))) return "HTML";
	if (
		isTrue(searchParams.get("exportJSON")) ||
		isTrue(searchParams.get("pretty"))
	) {
		return "JSON";
	}
	return null;
}

function applyBackendExportQueryParams(
	searchParams: URLSearchParams,
	outputType: string | null,
): void {
	if (!outputType) {
		return;
	}

	switch (outputType) {
		case "JSON":
			if (!searchParams.has("exportJSON")) {
				searchParams.set("exportJSON", "true");
			}
			return;
		case "CSV":
			if (!searchParams.has("exportCSV")) {
				searchParams.set("exportCSV", "true");
			}
			return;
		case "PDF":
			if (!searchParams.has("exportPDF")) {
				searchParams.set("exportPDF", "true");
			}
			return;
		case "XLS":
			if (!searchParams.has("exportXLS")) {
				searchParams.set("exportXLS", "true");
			}
			return;
		case "XLSX":
			if (!searchParams.has("exportXLSX")) {
				searchParams.set("exportXLSX", "true");
			}
			return;
		case "HTML":
			if (!searchParams.has("exportHTML")) {
				searchParams.set("exportHTML", "true");
			}
			return;
		default:
			return;
	}
}
