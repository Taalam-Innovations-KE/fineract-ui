import ExcelJS from "exceljs";
import type {
	DisbursementSummary,
	LoanMetadata,
	ScheduleRow,
	StatementRow,
} from "./loan-data";

/**
 * Creates a styled header row
 */
function styleHeaderRow(row: ExcelJS.Row): void {
	row.font = { bold: true, color: { argb: "FFFFFFFF" } };
	row.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF4472C4" },
	};
	row.alignment = { horizontal: "center", vertical: "middle" };
}

/**
 * Creates a styled title row
 */
function styleTitleRow(row: ExcelJS.Row): void {
	row.font = { bold: true, size: 14 };
}

/**
 * Creates a styled section header
 */
function styleSectionHeader(row: ExcelJS.Row): void {
	row.font = { bold: true, size: 11 };
	row.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE7E6E6" },
	};
}

/**
 * Formats currency columns
 */
function formatCurrencyColumn(column: Partial<ExcelJS.Column>): void {
	column.numFmt = "#,##0.00";
	column.width = 15;
}

/**
 * Generates Excel workbook for loan schedule
 */
export async function generateScheduleXLSX(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: ScheduleRow[],
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Fineract UI";
	workbook.created = new Date();

	const sheet = workbook.addWorksheet("Loan Schedule", {
		pageSetup: { orientation: "landscape" },
	});

	let rowNum = 1;

	// Title
	const titleRow = sheet.addRow(["LOAN SCHEDULE REPORT"]);
	styleTitleRow(titleRow);
	sheet.mergeCells(`A${rowNum}:H${rowNum}`);
	rowNum++;

	// Empty row
	sheet.addRow([]);
	rowNum++;

	// Loan details section
	const detailsHeader = sheet.addRow(["LOAN DETAILS"]);
	styleSectionHeader(detailsHeader);
	sheet.mergeCells(`A${rowNum}:B${rowNum}`);
	rowNum++;

	sheet.addRow(["Loan Account:", metadata.accountNo]);
	rowNum++;
	sheet.addRow(["Client Name:", metadata.clientName]);
	rowNum++;
	sheet.addRow(["Product:", metadata.productName]);
	rowNum++;
	sheet.addRow(["Status:", metadata.status]);
	rowNum++;
	sheet.addRow(["Currency:", metadata.currency]);
	rowNum++;

	// Empty row
	sheet.addRow([]);
	rowNum++;

	// Disbursement summary section
	const summaryHeader = sheet.addRow(["DISBURSEMENT SUMMARY"]);
	styleSectionHeader(summaryHeader);
	sheet.mergeCells(`A${rowNum}:B${rowNum}`);
	rowNum++;

	sheet.addRow(["Approved Amount:", summary.approvedAmount]);
	sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
	rowNum++;

	if (summary.upfrontFeeItems.length > 0) {
		sheet.addRow(["Upfront Fees Deducted:"]);
		rowNum++;
		for (const fee of summary.upfrontFeeItems) {
			sheet.addRow([`  ${fee.name}:`, fee.amount]);
			sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
			rowNum++;
		}
		sheet.addRow(["Total Upfront Fees:", summary.upfrontFeesTotal]);
		sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
		rowNum++;
	}

	const netRow = sheet.addRow(["Net Paid to Client:", summary.netPaidToClient]);
	netRow.font = { bold: true };
	sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
	sheet.getCell(`B${rowNum}`).font = {
		bold: true,
		color: { argb: "FF008000" },
	};
	rowNum++;

	sheet.addRow(["Disbursement Date:", summary.disbursementDate || ""]);
	rowNum++;

	// Empty rows
	sheet.addRow([]);
	rowNum++;
	sheet.addRow([]);
	rowNum++;

	// Schedule table header
	const scheduleHeader = sheet.addRow(["REPAYMENT SCHEDULE"]);
	styleSectionHeader(scheduleHeader);
	sheet.mergeCells(`A${rowNum}:H${rowNum}`);
	rowNum++;

	// Table headers
	const tableHeaderRow = sheet.addRow([
		"Installment",
		"Due Date",
		"Principal Due",
		"Interest Due",
		"Fees Due",
		"Penalties Due",
		"Total Due",
		"Principal Outstanding",
	]);
	styleHeaderRow(tableHeaderRow);
	rowNum++;

	// Data rows
	for (const row of rows) {
		sheet.addRow([
			row.installmentNumber,
			row.dueDate,
			row.principalDue,
			row.interestDue,
			row.feesDue,
			row.penaltiesDue,
			row.totalDue,
			row.principalOutstanding,
		]);
		rowNum++;
	}

	// Totals row
	const totals = rows.reduce(
		(acc, row) => ({
			principal: acc.principal + row.principalDue,
			interest: acc.interest + row.interestDue,
			fees: acc.fees + row.feesDue,
			penalties: acc.penalties + row.penaltiesDue,
			total: acc.total + row.totalDue,
		}),
		{ principal: 0, interest: 0, fees: 0, penalties: 0, total: 0 },
	);

	const totalRow = sheet.addRow([
		"TOTAL",
		"",
		totals.principal,
		totals.interest,
		totals.fees,
		totals.penalties,
		totals.total,
		"",
	]);
	totalRow.font = { bold: true };

	// Format currency columns
	["C", "D", "E", "F", "G", "H"].forEach((col) => {
		const column = sheet.getColumn(col);
		formatCurrencyColumn(column);
	});

	// Set column widths
	sheet.getColumn("A").width = 12;
	sheet.getColumn("B").width = 15;

	// Generate buffer
	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

/**
 * Generates Excel workbook for loan statement
 */
export async function generateStatementXLSX(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: StatementRow[],
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Fineract UI";
	workbook.created = new Date();

	const sheet = workbook.addWorksheet("Transaction Statement", {
		pageSetup: { orientation: "landscape" },
	});

	let rowNum = 1;

	// Title
	const titleRow = sheet.addRow(["LOAN TRANSACTION STATEMENT"]);
	styleTitleRow(titleRow);
	sheet.mergeCells(`A${rowNum}:H${rowNum}`);
	rowNum++;

	// Empty row
	sheet.addRow([]);
	rowNum++;

	// Loan details section
	const detailsHeader = sheet.addRow(["LOAN DETAILS"]);
	styleSectionHeader(detailsHeader);
	sheet.mergeCells(`A${rowNum}:B${rowNum}`);
	rowNum++;

	sheet.addRow(["Loan Account:", metadata.accountNo]);
	rowNum++;
	sheet.addRow(["Client Name:", metadata.clientName]);
	rowNum++;
	sheet.addRow(["Product:", metadata.productName]);
	rowNum++;
	sheet.addRow(["Status:", metadata.status]);
	rowNum++;
	sheet.addRow(["Currency:", metadata.currency]);
	rowNum++;

	// Empty row
	sheet.addRow([]);
	rowNum++;

	// Disbursement summary section
	const summaryHeader = sheet.addRow(["DISBURSEMENT SUMMARY"]);
	styleSectionHeader(summaryHeader);
	sheet.mergeCells(`A${rowNum}:B${rowNum}`);
	rowNum++;

	sheet.addRow(["Approved Amount:", summary.approvedAmount]);
	sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
	rowNum++;

	if (summary.upfrontFeeItems.length > 0) {
		sheet.addRow(["Upfront Fees Deducted:"]);
		rowNum++;
		for (const fee of summary.upfrontFeeItems) {
			sheet.addRow([`  ${fee.name}:`, fee.amount]);
			sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
			rowNum++;
		}
		sheet.addRow(["Total Upfront Fees:", summary.upfrontFeesTotal]);
		sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
		rowNum++;
	}

	const netRow = sheet.addRow(["Net Paid to Client:", summary.netPaidToClient]);
	netRow.font = { bold: true };
	sheet.getCell(`B${rowNum}`).numFmt = "#,##0.00";
	sheet.getCell(`B${rowNum}`).font = {
		bold: true,
		color: { argb: "FF008000" },
	};
	rowNum++;

	sheet.addRow(["Disbursement Date:", summary.disbursementDate || ""]);
	rowNum++;

	// Empty rows
	sheet.addRow([]);
	rowNum++;
	sheet.addRow([]);
	rowNum++;

	// Transaction table header
	const transHeader = sheet.addRow(["TRANSACTION HISTORY"]);
	styleSectionHeader(transHeader);
	sheet.mergeCells(`A${rowNum}:H${rowNum}`);
	rowNum++;

	// Table headers
	const tableHeaderRow = sheet.addRow([
		"Date",
		"Type",
		"Amount",
		"Principal",
		"Interest",
		"Fees",
		"Penalties",
		"Principal Outstanding",
	]);
	styleHeaderRow(tableHeaderRow);
	rowNum++;

	// Data rows
	for (const row of rows) {
		sheet.addRow([
			row.date,
			row.type,
			row.amount,
			row.principalPortion,
			row.interestPortion,
			row.feesPortion,
			row.penaltiesPortion,
			row.principalOutstanding,
		]);
		rowNum++;
	}

	// Format currency columns
	["C", "D", "E", "F", "G", "H"].forEach((col) => {
		const column = sheet.getColumn(col);
		formatCurrencyColumn(column);
	});

	// Set column widths
	sheet.getColumn("A").width = 15;
	sheet.getColumn("B").width = 20;

	// Generate buffer
	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}
