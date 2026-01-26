import type {
	DisbursementSummary,
	LoanMetadata,
	ScheduleRow,
	StatementRow,
} from "./loan-data";

/**
 * Escapes a value for CSV (handles commas, quotes, newlines)
 */
function escapeCSV(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Formats a number for CSV with 2 decimal places
 */
function formatNumber(value: number): string {
	return value.toFixed(2);
}

/**
 * Generates CSV content for loan schedule
 */
export function generateScheduleCSV(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: ScheduleRow[],
): string {
	const lines: string[] = [];

	// Header section
	lines.push("LOAN SCHEDULE REPORT");
	lines.push("");
	lines.push(`Loan Account,${escapeCSV(metadata.accountNo)}`);
	lines.push(`Client Name,${escapeCSV(metadata.clientName)}`);
	lines.push(`Product,${escapeCSV(metadata.productName)}`);
	lines.push(`Status,${escapeCSV(metadata.status)}`);
	lines.push(`Currency,${escapeCSV(metadata.currency)}`);
	lines.push("");

	// Disbursement summary
	lines.push("DISBURSEMENT SUMMARY");
	lines.push(`Approved Amount,${formatNumber(summary.approvedAmount)}`);

	if (summary.upfrontFeeItems.length > 0) {
		lines.push("Upfront Fees Deducted:");
		for (const fee of summary.upfrontFeeItems) {
			lines.push(`  ${escapeCSV(fee.name)},${formatNumber(fee.amount)}`);
		}
		lines.push(`Total Upfront Fees,${formatNumber(summary.upfrontFeesTotal)}`);
	}

	lines.push(`Net Paid to Client,${formatNumber(summary.netPaidToClient)}`);
	lines.push(`Disbursement Date,${escapeCSV(summary.disbursementDate || "")}`);
	lines.push("");

	// Schedule table header
	lines.push("REPAYMENT SCHEDULE");
	lines.push(
		[
			"Installment",
			"Due Date",
			"Principal Due",
			"Interest Due",
			"Fees Due",
			"Penalties Due",
			"Total Due",
			"Principal Outstanding",
		].join(","),
	);

	// Schedule rows
	for (const row of rows) {
		lines.push(
			[
				row.installmentNumber,
				escapeCSV(row.dueDate),
				formatNumber(row.principalDue),
				formatNumber(row.interestDue),
				formatNumber(row.feesDue),
				formatNumber(row.penaltiesDue),
				formatNumber(row.totalDue),
				formatNumber(row.principalOutstanding),
			].join(","),
		);
	}

	// Totals
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

	lines.push(
		[
			"TOTAL",
			"",
			formatNumber(totals.principal),
			formatNumber(totals.interest),
			formatNumber(totals.fees),
			formatNumber(totals.penalties),
			formatNumber(totals.total),
			"",
		].join(","),
	);

	return lines.join("\n");
}

/**
 * Generates CSV content for loan statement
 */
export function generateStatementCSV(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: StatementRow[],
): string {
	const lines: string[] = [];

	// Header section
	lines.push("LOAN TRANSACTION STATEMENT");
	lines.push("");
	lines.push(`Loan Account,${escapeCSV(metadata.accountNo)}`);
	lines.push(`Client Name,${escapeCSV(metadata.clientName)}`);
	lines.push(`Product,${escapeCSV(metadata.productName)}`);
	lines.push(`Status,${escapeCSV(metadata.status)}`);
	lines.push(`Currency,${escapeCSV(metadata.currency)}`);
	lines.push("");

	// Disbursement summary
	lines.push("DISBURSEMENT SUMMARY");
	lines.push(`Approved Amount,${formatNumber(summary.approvedAmount)}`);

	if (summary.upfrontFeeItems.length > 0) {
		lines.push("Upfront Fees Deducted:");
		for (const fee of summary.upfrontFeeItems) {
			lines.push(`  ${escapeCSV(fee.name)},${formatNumber(fee.amount)}`);
		}
		lines.push(`Total Upfront Fees,${formatNumber(summary.upfrontFeesTotal)}`);
	}

	lines.push(`Net Paid to Client,${formatNumber(summary.netPaidToClient)}`);
	lines.push(`Disbursement Date,${escapeCSV(summary.disbursementDate || "")}`);
	lines.push("");

	// Statement table header
	lines.push("TRANSACTION HISTORY");
	lines.push(
		[
			"Date",
			"Type",
			"Amount",
			"Principal",
			"Interest",
			"Fees",
			"Penalties",
			"Principal Outstanding",
		].join(","),
	);

	// Statement rows
	for (const row of rows) {
		lines.push(
			[
				escapeCSV(row.date),
				escapeCSV(row.type),
				formatNumber(row.amount),
				formatNumber(row.principalPortion),
				formatNumber(row.interestPortion),
				formatNumber(row.feesPortion),
				formatNumber(row.penaltiesPortion),
				formatNumber(row.principalOutstanding),
			].join(","),
		);
	}

	return lines.join("\n");
}
