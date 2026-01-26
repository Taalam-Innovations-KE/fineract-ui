import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
	fineractFetch,
	getTenantFromRequest,
} from "@/lib/fineract/client.server";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type { GetLoansLoanIdResponse } from "@/lib/fineract/generated/types.gen";
import {
	buildScheduleRows,
	buildStatementRows,
	computeDisbursementSummary,
	extractLoanMetadata,
} from "./loan-data";

export type ExportType = "schedule" | "statement";
export type ExportFormat = "csv" | "xlsx" | "pdf";

/**
 * Fetches loan data with all necessary associations for exports
 */
export async function fetchLoanExportData(
	loanId: string,
	tenantId: string,
): Promise<GetLoansLoanIdResponse> {
	const loan = await fineractFetch<GetLoansLoanIdResponse>(
		`/v1/loans/${loanId}?associations=repaymentSchedule,transactions,charges`,
		{ tenantId },
	);
	return loan;
}

/**
 * Generates export content based on type and format
 */
export async function generateExport(
	loan: GetLoansLoanIdResponse,
	exportType: ExportType,
	format: ExportFormat,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
	const metadata = extractLoanMetadata(loan);
	const charges = loan.charges || [];
	const summary = computeDisbursementSummary(loan, charges);

	let buffer: Buffer;
	let contentType: string;
	let extension: string;

	if (exportType === "schedule") {
		const periods = loan.repaymentSchedule?.periods || [];
		const rows = buildScheduleRows(periods);

		if (format === "csv") {
			const { generateScheduleCSV } = await import("./csv");
			const csv = generateScheduleCSV(metadata, summary, rows);
			buffer = Buffer.from(csv, "utf-8");
			contentType = "text/csv; charset=utf-8";
			extension = "csv";
		} else if (format === "xlsx") {
			const { generateScheduleXLSX } = await import("./xlsx");
			buffer = await generateScheduleXLSX(metadata, summary, rows);
			contentType =
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			extension = "xlsx";
		} else {
			const { generateSchedulePDF } = await import("./pdf");
			buffer = await generateSchedulePDF(metadata, summary, rows);
			contentType = "application/pdf";
			extension = "pdf";
		}
	} else {
		// statement
		const transactions = loan.transactions || [];
		const rows = buildStatementRows(transactions, summary.approvedAmount);

		if (format === "csv") {
			const { generateStatementCSV } = await import("./csv");
			const csv = generateStatementCSV(metadata, summary, rows);
			buffer = Buffer.from(csv, "utf-8");
			contentType = "text/csv; charset=utf-8";
			extension = "csv";
		} else if (format === "xlsx") {
			const { generateStatementXLSX } = await import("./xlsx");
			buffer = await generateStatementXLSX(metadata, summary, rows);
			contentType =
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			extension = "xlsx";
		} else {
			const { generateStatementPDF } = await import("./pdf");
			buffer = await generateStatementPDF(metadata, summary, rows);
			contentType = "application/pdf";
			extension = "pdf";
		}
	}

	const filename = `loan-${metadata.accountNo || loan.id}-${exportType}.${extension}`;

	return { buffer, contentType, filename };
}

/**
 * Creates an export route handler
 */
export function createExportHandler(
	exportType: ExportType,
	format: ExportFormat,
) {
	return async function handler(
		request: NextRequest,
		{ params }: { params: Promise<{ loanId: string }> },
	): Promise<NextResponse> {
		try {
			const { loanId } = await params;
			const tenantId = getTenantFromRequest(request);

			// Fetch loan data
			const loan = await fetchLoanExportData(loanId, tenantId);

			// Generate export
			const { buffer, contentType, filename } = await generateExport(
				loan,
				exportType,
				format,
			);

			// Return file response
			return new NextResponse(new Uint8Array(buffer), {
				status: 200,
				headers: {
					"Content-Type": contentType,
					"Content-Disposition": `attachment; filename="${filename}"`,
					"Content-Length": buffer.length.toString(),
				},
			});
		} catch (error) {
			console.error(`Export error (${exportType}/${format}):`, error);
			const mappedError = mapFineractError(error);
			return NextResponse.json(mappedError, {
				status: mappedError.statusCode || 500,
			});
		}
	};
}
