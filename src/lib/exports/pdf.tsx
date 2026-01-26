import {
	Document,
	Page,
	renderToBuffer,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type {
	DisbursementSummary,
	LoanMetadata,
	ScheduleRow,
	StatementRow,
} from "./loan-data";

// PDF Styles
const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontSize: 9,
		fontFamily: "Helvetica",
	},
	title: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 15,
		textAlign: "center",
		color: "#1a365d",
	},
	sectionHeader: {
		fontSize: 11,
		fontWeight: "bold",
		backgroundColor: "#e2e8f0",
		padding: 6,
		marginTop: 15,
		marginBottom: 8,
	},
	row: {
		flexDirection: "row",
		marginBottom: 3,
	},
	label: {
		width: "40%",
		color: "#4a5568",
	},
	value: {
		width: "60%",
		fontWeight: "bold",
	},
	netPaid: {
		color: "#22543d",
		fontWeight: "bold",
	},
	feeDeducted: {
		color: "#c05621",
	},
	table: {
		marginTop: 10,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: "#4472c4",
		color: "white",
		fontWeight: "bold",
		padding: 6,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 0.5,
		borderBottomColor: "#e2e8f0",
		padding: 5,
	},
	tableRowAlt: {
		backgroundColor: "#f7fafc",
	},
	tableTotalRow: {
		flexDirection: "row",
		backgroundColor: "#edf2f7",
		fontWeight: "bold",
		padding: 6,
		marginTop: 2,
	},
	// Schedule columns
	colInstallment: { width: "8%" },
	colDate: { width: "12%" },
	colPrincipal: { width: "13%", textAlign: "right" },
	colInterest: { width: "13%", textAlign: "right" },
	colFees: { width: "12%", textAlign: "right" },
	colPenalties: { width: "12%", textAlign: "right" },
	colTotal: { width: "14%", textAlign: "right" },
	colOutstanding: { width: "16%", textAlign: "right" },
	// Statement columns
	colTxDate: { width: "12%" },
	colTxType: { width: "18%" },
	colTxAmount: { width: "12%", textAlign: "right" },
	colTxPrincipal: { width: "12%", textAlign: "right" },
	colTxInterest: { width: "12%", textAlign: "right" },
	colTxFees: { width: "10%", textAlign: "right" },
	colTxPenalties: { width: "10%", textAlign: "right" },
	colTxOutstanding: { width: "14%", textAlign: "right" },
	footer: {
		position: "absolute",
		bottom: 20,
		left: 30,
		right: 30,
		fontSize: 8,
		color: "#718096",
		textAlign: "center",
	},
});

/**
 * Formats a number for display
 */
function formatNumber(value: number): string {
	return value.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * Loan Details Component
 */
function LoanDetails({ metadata }: { metadata: LoanMetadata }) {
	return (
		<View>
			<Text style={styles.sectionHeader}>LOAN DETAILS</Text>
			<View style={styles.row}>
				<Text style={styles.label}>Loan Account:</Text>
				<Text style={styles.value}>{metadata.accountNo}</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>Client Name:</Text>
				<Text style={styles.value}>{metadata.clientName}</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>Product:</Text>
				<Text style={styles.value}>{metadata.productName}</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>Status:</Text>
				<Text style={styles.value}>{metadata.status}</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.label}>Currency:</Text>
				<Text style={styles.value}>{metadata.currency}</Text>
			</View>
		</View>
	);
}

/**
 * Disbursement Summary Component
 */
function DisbursementSummarySection({
	summary,
	currency,
}: {
	summary: DisbursementSummary;
	currency: string;
}) {
	return (
		<View>
			<Text style={styles.sectionHeader}>DISBURSEMENT SUMMARY</Text>
			<View style={styles.row}>
				<Text style={styles.label}>Approved Amount:</Text>
				<Text style={styles.value}>
					{currency} {formatNumber(summary.approvedAmount)}
				</Text>
			</View>

			{summary.upfrontFeeItems.length > 0 && (
				<>
					<View style={styles.row}>
						<Text style={styles.label}>Upfront Fees Deducted:</Text>
					</View>
					{summary.upfrontFeeItems.map((fee, index) => (
						<View style={styles.row} key={index}>
							<Text style={[styles.label, { paddingLeft: 10 }]}>
								{fee.name}:
							</Text>
							<Text style={[styles.value, styles.feeDeducted]}>
								- {currency} {formatNumber(fee.amount)}
							</Text>
						</View>
					))}
					<View style={styles.row}>
						<Text style={styles.label}>Total Upfront Fees:</Text>
						<Text style={[styles.value, styles.feeDeducted]}>
							- {currency} {formatNumber(summary.upfrontFeesTotal)}
						</Text>
					</View>
				</>
			)}

			<View
				style={[
					styles.row,
					{
						marginTop: 5,
						paddingTop: 5,
						borderTopWidth: 1,
						borderTopColor: "#e2e8f0",
					},
				]}
			>
				<Text style={[styles.label, { fontWeight: "bold" }]}>
					Net Paid to Client:
				</Text>
				<Text style={[styles.value, styles.netPaid]}>
					{currency} {formatNumber(summary.netPaidToClient)}
				</Text>
			</View>

			{summary.disbursementDate && (
				<View style={styles.row}>
					<Text style={styles.label}>Disbursement Date:</Text>
					<Text style={styles.value}>{summary.disbursementDate}</Text>
				</View>
			)}
		</View>
	);
}

/**
 * Schedule PDF Document
 */
function SchedulePDF({
	metadata,
	summary,
	rows,
}: {
	metadata: LoanMetadata;
	summary: DisbursementSummary;
	rows: ScheduleRow[];
}) {
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

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<Text style={styles.title}>LOAN SCHEDULE REPORT</Text>

				<LoanDetails metadata={metadata} />
				<DisbursementSummarySection
					summary={summary}
					currency={metadata.currency}
				/>

				<Text style={styles.sectionHeader}>REPAYMENT SCHEDULE</Text>

				<View style={styles.table}>
					{/* Header */}
					<View style={styles.tableHeader}>
						<Text style={styles.colInstallment}>#</Text>
						<Text style={styles.colDate}>Due Date</Text>
						<Text style={styles.colPrincipal}>Principal</Text>
						<Text style={styles.colInterest}>Interest</Text>
						<Text style={styles.colFees}>Fees</Text>
						<Text style={styles.colPenalties}>Penalties</Text>
						<Text style={styles.colTotal}>Total Due</Text>
						<Text style={styles.colOutstanding}>Outstanding</Text>
					</View>

					{/* Rows */}
					{rows.map((row, index) => (
						<View
							key={index}
							style={[
								styles.tableRow,
								...(index % 2 === 1 ? [styles.tableRowAlt] : []),
							]}
						>
							<Text style={styles.colInstallment}>{row.installmentNumber}</Text>
							<Text style={styles.colDate}>{row.dueDate}</Text>
							<Text style={styles.colPrincipal}>
								{formatNumber(row.principalDue)}
							</Text>
							<Text style={styles.colInterest}>
								{formatNumber(row.interestDue)}
							</Text>
							<Text style={styles.colFees}>{formatNumber(row.feesDue)}</Text>
							<Text style={styles.colPenalties}>
								{formatNumber(row.penaltiesDue)}
							</Text>
							<Text style={styles.colTotal}>{formatNumber(row.totalDue)}</Text>
							<Text style={styles.colOutstanding}>
								{formatNumber(row.principalOutstanding)}
							</Text>
						</View>
					))}

					{/* Totals */}
					<View style={styles.tableTotalRow}>
						<Text style={styles.colInstallment}>TOTAL</Text>
						<Text style={styles.colDate}></Text>
						<Text style={styles.colPrincipal}>
							{formatNumber(totals.principal)}
						</Text>
						<Text style={styles.colInterest}>
							{formatNumber(totals.interest)}
						</Text>
						<Text style={styles.colFees}>{formatNumber(totals.fees)}</Text>
						<Text style={styles.colPenalties}>
							{formatNumber(totals.penalties)}
						</Text>
						<Text style={styles.colTotal}>{formatNumber(totals.total)}</Text>
						<Text style={styles.colOutstanding}></Text>
					</View>
				</View>

				<Text style={styles.footer}>
					Generated on {new Date().toLocaleDateString("en-GB")} | Fineract UI
				</Text>
			</Page>
		</Document>
	);
}

/**
 * Statement PDF Document
 */
function StatementPDF({
	metadata,
	summary,
	rows,
}: {
	metadata: LoanMetadata;
	summary: DisbursementSummary;
	rows: StatementRow[];
}) {
	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<Text style={styles.title}>LOAN TRANSACTION STATEMENT</Text>

				<LoanDetails metadata={metadata} />
				<DisbursementSummarySection
					summary={summary}
					currency={metadata.currency}
				/>

				<Text style={styles.sectionHeader}>TRANSACTION HISTORY</Text>

				<View style={styles.table}>
					{/* Header */}
					<View style={styles.tableHeader}>
						<Text style={styles.colTxDate}>Date</Text>
						<Text style={styles.colTxType}>Type</Text>
						<Text style={styles.colTxAmount}>Amount</Text>
						<Text style={styles.colTxPrincipal}>Principal</Text>
						<Text style={styles.colTxInterest}>Interest</Text>
						<Text style={styles.colTxFees}>Fees</Text>
						<Text style={styles.colTxPenalties}>Penalties</Text>
						<Text style={styles.colTxOutstanding}>Outstanding</Text>
					</View>

					{/* Rows */}
					{rows.map((row, index) => (
						<View
							key={index}
							style={[
								styles.tableRow,
								...(index % 2 === 1 ? [styles.tableRowAlt] : []),
							]}
						>
							<Text style={styles.colTxDate}>{row.date}</Text>
							<Text style={styles.colTxType}>{row.type}</Text>
							<Text style={styles.colTxAmount}>{formatNumber(row.amount)}</Text>
							<Text style={styles.colTxPrincipal}>
								{formatNumber(row.principalPortion)}
							</Text>
							<Text style={styles.colTxInterest}>
								{formatNumber(row.interestPortion)}
							</Text>
							<Text style={styles.colTxFees}>
								{formatNumber(row.feesPortion)}
							</Text>
							<Text style={styles.colTxPenalties}>
								{formatNumber(row.penaltiesPortion)}
							</Text>
							<Text style={styles.colTxOutstanding}>
								{formatNumber(row.principalOutstanding)}
							</Text>
						</View>
					))}
				</View>

				<Text style={styles.footer}>
					Generated on {new Date().toLocaleDateString("en-GB")} | Fineract UI
				</Text>
			</Page>
		</Document>
	);
}

/**
 * Generates PDF buffer for loan schedule
 */
export async function generateSchedulePDF(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: ScheduleRow[],
): Promise<Buffer> {
	const buffer = await renderToBuffer(
		<SchedulePDF metadata={metadata} summary={summary} rows={rows} />,
	);
	return Buffer.from(buffer);
}

/**
 * Generates PDF buffer for loan statement
 */
export async function generateStatementPDF(
	metadata: LoanMetadata,
	summary: DisbursementSummary,
	rows: StatementRow[],
): Promise<Buffer> {
	const buffer = await renderToBuffer(
		<StatementPDF metadata={metadata} summary={summary} rows={rows} />,
	);
	return Buffer.from(buffer);
}
