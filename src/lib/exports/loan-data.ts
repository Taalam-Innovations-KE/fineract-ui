import "server-only";
import type {
	GetLoansLoanIdLoanChargeData,
	GetLoansLoanIdRepaymentPeriod,
	GetLoansLoanIdResponse,
	GetLoansLoanIdTransactions,
} from "@/lib/fineract/generated/types.gen";

/**
 * Loan export data structure with computed summaries
 */
export interface LoanExportData {
	loan: GetLoansLoanIdResponse;
	schedulePeriods: GetLoansLoanIdRepaymentPeriod[];
	transactions: GetLoansLoanIdTransactions[];
	charges: GetLoansLoanIdLoanChargeData[];
	disbursementSummary: DisbursementSummary;
	currency: string;
}

export interface DisbursementSummary {
	approvedAmount: number;
	upfrontFeeItems: { name: string; amount: number }[];
	upfrontFeesTotal: number;
	netPaidToClient: number;
	disbursementDate: string | null;
}

export interface ScheduleRow {
	installmentNumber: number;
	dueDate: string;
	principalDue: number;
	interestDue: number;
	feesDue: number;
	penaltiesDue: number;
	totalDue: number;
	principalOutstanding: number;
}

export interface StatementRow {
	date: string;
	type: string;
	amount: number;
	principalPortion: number;
	interestPortion: number;
	feesPortion: number;
	penaltiesPortion: number;
	principalOutstanding: number;
}

/**
 * Charge timing types that indicate upfront/disbursement charges
 */
const UPFRONT_CHARGE_TIME_TYPES = [
	"disbursement",
	"tranche disbursement",
	"specified due date", // Often used for upfront fees
];

/**
 * Known upfront fee names (fallback when timing flags aren't available)
 */
const KNOWN_UPFRONT_FEE_NAMES = [
	"processing fee",
	"disbursement fee",
	"application fee",
	"origination fee",
	"duty",
	"stamp duty",
	"rev share",
	"revenue share",
	"guarantee pool",
	"onboarding",
	"admin fee",
	"administrative fee",
];

/**
 * Determines if a charge is an upfront/disbursement fee
 */
export function isUpfrontCharge(charge: GetLoansLoanIdLoanChargeData): boolean {
	// Check explicit flags first (if available in your Fineract version)
	if ("deductedFromDisbursement" in charge && charge.deductedFromDisbursement) {
		return true;
	}
	if ("isPaidAtDisbursement" in charge && charge.isPaidAtDisbursement) {
		return true;
	}

	// Check charge time type
	const chargeTimeType =
		charge.chargeTimeType?.value?.toLowerCase() ||
		charge.chargeTimeType?.code?.toLowerCase() ||
		"";

	if (
		UPFRONT_CHARGE_TIME_TYPES.some((t) =>
			chargeTimeType.includes(t.toLowerCase()),
		)
	) {
		return true;
	}

	// Fallback: check charge name against known upfront fee names
	const chargeName = (charge.name || "").toLowerCase();
	if (KNOWN_UPFRONT_FEE_NAMES.some((name) => chargeName.includes(name))) {
		return true;
	}

	return false;
}

/**
 * Computes disbursement summary including upfront fees
 */
export function computeDisbursementSummary(
	loan: GetLoansLoanIdResponse,
	charges: GetLoansLoanIdLoanChargeData[],
): DisbursementSummary {
	const approvedAmount = loan.approvedPrincipal || loan.principal || 0;

	// Identify upfront fees
	const upfrontFeeItems: { name: string; amount: number }[] = [];

	for (const charge of charges) {
		if (isUpfrontCharge(charge)) {
			upfrontFeeItems.push({
				name: charge.name || "Fee",
				amount: charge.amount || 0,
			});
		}
	}

	const upfrontFeesTotal = upfrontFeeItems.reduce(
		(sum, item) => sum + item.amount,
		0,
	);

	// Use netDisbursalAmount if available, otherwise calculate
	const netPaidToClient =
		loan.netDisbursalAmount ?? approvedAmount - upfrontFeesTotal;

	// Get disbursement date
	let disbursementDate: string | null = null;
	if (loan.timeline?.actualDisbursementDate) {
		const date = loan.timeline.actualDisbursementDate;
		if (Array.isArray(date)) {
			const [year, month, day] = date;
			disbursementDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		} else {
			disbursementDate = date;
		}
	}

	return {
		approvedAmount,
		upfrontFeeItems,
		upfrontFeesTotal,
		netPaidToClient,
		disbursementDate,
	};
}

/**
 * Formats a date array or string to ISO date string
 */
export function formatDateToISO(
	dateInput: string | number[] | undefined,
): string {
	if (!dateInput) return "";
	if (Array.isArray(dateInput)) {
		const [year, month, day] = dateInput;
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}
	return dateInput;
}

/**
 * Formats a date for display in exports
 */
export function formatDateForDisplay(
	dateInput: string | number[] | undefined,
): string {
	if (!dateInput) return "";
	let date: Date;
	if (Array.isArray(dateInput)) {
		const [year, month, day] = dateInput;
		date = new Date(year, month - 1, day);
	} else {
		date = new Date(dateInput);
	}
	return date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/**
 * Builds schedule rows from repayment periods
 */
export function buildScheduleRows(
	periods: GetLoansLoanIdRepaymentPeriod[],
): ScheduleRow[] {
	const rows: ScheduleRow[] = [];

	for (const period of periods) {
		// Skip disbursement period (period 0 with no due amounts)
		if (period.period === 0 || period.period === undefined) {
			continue;
		}

		rows.push({
			installmentNumber: period.period,
			dueDate: formatDateForDisplay(period.dueDate),
			principalDue: period.principalDue || 0,
			interestDue: period.interestDue || 0,
			feesDue: period.feeChargesDue || 0,
			penaltiesDue: period.penaltyChargesDue || 0,
			totalDue: period.totalDueForPeriod || 0,
			principalOutstanding: period.principalLoanBalanceOutstanding || 0,
		});
	}

	return rows;
}

/**
 * Gets transaction type display name
 */
function getTransactionTypeName(
	type: { code?: string; description?: string } | undefined,
): string {
	if (!type) return "Unknown";

	const code = type.code?.toLowerCase() || "";

	if (code.includes("disbursement")) return "Disbursement";
	if (code.includes("repaymentatdisbursement"))
		return "Fee Deduction (Net-off)";
	if (code.includes("repayment")) return "Repayment";
	if (code.includes("writeoff") || code.includes("write_off"))
		return "Write Off";
	if (code.includes("waiver") || code.includes("waive")) return "Waiver";
	if (code.includes("charge")) return "Charge";
	if (code.includes("accrual")) return "Accrual";

	return type.description || type.code || "Unknown";
}

/**
 * Builds statement rows from transactions with running balance calculation
 */
export function buildStatementRows(
	transactions: GetLoansLoanIdTransactions[],
	approvedPrincipal: number,
): StatementRow[] {
	const rows: StatementRow[] = [];

	// Sort transactions by date (oldest first)
	const sortedTransactions = [...transactions].sort((a, b) => {
		const dateA = formatDateToISO(a.date);
		const dateB = formatDateToISO(b.date);
		return dateA.localeCompare(dateB);
	});

	let runningPrincipalOutstanding = 0;

	for (const tx of sortedTransactions) {
		// Skip reversed transactions
		if (tx.manuallyReversed) continue;

		const txType = tx.type?.code?.toLowerCase() || "";
		const principalPortion = tx.principalPortion || 0;

		// Calculate running balance
		if (txType.includes("disbursement") && !txType.includes("repayment")) {
			// Disbursement: set to disbursed amount
			runningPrincipalOutstanding = tx.amount || approvedPrincipal;
		} else if (txType.includes("repayment") || txType.includes("writeoff")) {
			// Repayment/write-off: reduce principal
			runningPrincipalOutstanding = Math.max(
				0,
				runningPrincipalOutstanding - principalPortion,
			);
		}

		// Use transaction's outstanding balance if available
		const principalOutstanding =
			tx.outstandingLoanBalance ?? runningPrincipalOutstanding;

		rows.push({
			date: formatDateForDisplay(tx.date),
			type: getTransactionTypeName(tx.type),
			amount: tx.amount || 0,
			principalPortion,
			interestPortion: tx.interestPortion || 0,
			feesPortion: tx.feeChargesPortion || 0,
			penaltiesPortion: tx.penaltyChargesPortion || 0,
			principalOutstanding,
		});
	}

	return rows;
}

/**
 * Loan metadata for export headers
 */
export interface LoanMetadata {
	loanId: string;
	accountNo: string;
	clientName: string;
	productName: string;
	status: string;
	currency: string;
	disbursementDate: string;
	maturityDate: string;
}

/**
 * Extracts loan metadata for export headers
 */
export function extractLoanMetadata(
	loan: GetLoansLoanIdResponse,
): LoanMetadata {
	return {
		loanId: String(loan.id || ""),
		accountNo: loan.accountNo || "",
		clientName: loan.clientName || "",
		productName: loan.loanProductName || "",
		status: loan.status?.description || loan.status?.code || "",
		currency: loan.currency?.displaySymbol || loan.currency?.code || "KES",
		disbursementDate: formatDateForDisplay(
			loan.timeline?.actualDisbursementDate,
		),
		maturityDate: formatDateForDisplay(loan.timeline?.expectedMaturityDate),
	};
}
