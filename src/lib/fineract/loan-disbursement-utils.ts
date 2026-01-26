import type {
	GetLoansLoanIdResponse,
	GetLoansLoanIdTransactions,
} from "./generated/types.gen";

/**
 * Summary of loan disbursement with net-off fee calculations
 */
export interface DisbursementSummary {
	/** Approved principal amount */
	approvedPrincipal: number;
	/** Gross amount disbursed */
	grossDisbursed: number;
	/** Upfront fees deducted at disbursement */
	upfrontFeesDeducted: number;
	/** Net amount paid to client */
	netPaidToClient: number;
	/** Disbursement date */
	disbursementDate: string | number[] | undefined;
	/** Payment method from disbursement transaction */
	paymentMethod: string | undefined;
	/** Whether fees were netted off at disbursement */
	hasNetOff: boolean;
	/** The disbursement transaction */
	disbursementTransaction: GetLoansLoanIdTransactions | undefined;
	/** The fee net-off transaction (repayment at disbursement) */
	feeNetOffTransaction: GetLoansLoanIdTransactions | undefined;
}

/**
 * Extract disbursement summary from loan data
 * Identifies gross disbursement, upfront fees, and net payout to client
 */
export function getDisbursementSummary(
	loan: GetLoansLoanIdResponse | undefined,
	transactions: GetLoansLoanIdTransactions[] | undefined,
): DisbursementSummary | null {
	if (!loan) return null;

	const summary = loan.summary;

	// Find disbursement transaction
	const disbTx = transactions?.find(
		(t) =>
			t.type?.code === "loanTransactionType.disbursement" &&
			!t.manuallyReversed,
	);

	// Find fee net-off transaction (repayment at disbursement)
	const feeNetOffTx = transactions?.find(
		(t) =>
			t.type?.code === "loanTransactionType.repaymentAtDisbursement" &&
			(t.feeChargesPortion ?? 0) > 0 &&
			!t.manuallyReversed,
	);

	// Compute gross disbursed amount
	const grossDisbursed =
		disbTx?.amount ?? summary?.principalDisbursed ?? loan.principal ?? 0;

	// Compute upfront fees deducted
	// Prefer feeChargesDueAtDisbursementCharged if available, otherwise use fee net-off transaction
	const upfrontFeesDeducted =
		summary?.feeChargesDueAtDisbursementCharged ??
		feeNetOffTx?.feeChargesPortion ??
		0;

	// Net paid to client
	const netPaidToClient =
		loan.netDisbursalAmount ??
		disbTx?.netDisbursalAmount ??
		grossDisbursed - upfrontFeesDeducted;

	// Payment method from disbursement transaction
	const paymentMethod = disbTx?.paymentDetailData?.paymentType?.name;

	// Disbursement date from timeline or transaction
	const disbursementDate =
		loan.timeline?.actualDisbursementDate ?? disbTx?.date;

	return {
		approvedPrincipal: loan.approvedPrincipal ?? loan.principal ?? 0,
		grossDisbursed,
		upfrontFeesDeducted,
		netPaidToClient,
		disbursementDate,
		paymentMethod,
		hasNetOff: upfrontFeesDeducted > 0,
		disbursementTransaction: disbTx,
		feeNetOffTransaction: feeNetOffTx,
	};
}

/**
 * Transaction type display configuration
 */
interface TransactionTypeDisplay {
	/** User-friendly label */
	label: string;
	/** Badge variant for styling */
	variant: "default" | "secondary" | "outline" | "destructive";
	/** Whether this is a net-off type transaction */
	isNetOff: boolean;
}

/**
 * Get user-friendly display label for transaction type
 * Uses enhanced labels for disbursement-related transactions
 */
export function getTransactionTypeDisplay(
	type: { code?: string; description?: string } | undefined,
	hasNetOffContext = false,
): TransactionTypeDisplay {
	if (!type?.code)
		return { label: "Unknown", variant: "outline", isNetOff: false };

	const code = type.code.toLowerCase();

	// Disbursement - show "Loan Disbursed (Gross)" when there's net-off context
	if (code === "loantransactiontype.disbursement") {
		return {
			label: hasNetOffContext ? "Loan Disbursed (Gross)" : "Disbursement",
			variant: "secondary",
			isNetOff: false,
		};
	}

	// Repayment at disbursement - this is the fee net-off
	if (code === "loantransactiontype.repaymentatdisbursement") {
		return {
			label: "Upfront Fees Deducted (Net-off)",
			variant: "outline",
			isNetOff: true,
		};
	}

	// Standard repayment
	if (code.includes("repayment")) {
		return { label: "Repayment", variant: "default", isNetOff: false };
	}

	// Write off
	if (code.includes("writeoff") || code.includes("write_off")) {
		return { label: "Write Off", variant: "destructive", isNetOff: false };
	}

	// Waiver
	if (code.includes("waiver") || code.includes("waive")) {
		return { label: "Waiver", variant: "outline", isNetOff: false };
	}

	// Charge
	if (code.includes("charge")) {
		return { label: "Charge", variant: "secondary", isNetOff: false };
	}

	// Accrual
	if (code.includes("accrual")) {
		return { label: "Accrual", variant: "outline", isNetOff: false };
	}

	return {
		label: type.description || type.code,
		variant: "outline",
		isNetOff: false,
	};
}

/**
 * Check if loan has upfront fees that were netted off at disbursement
 */
export function hasUpfrontFeesNetOff(
	loan: GetLoansLoanIdResponse | undefined,
	transactions: GetLoansLoanIdTransactions[] | undefined,
): boolean {
	if (!loan) return false;

	// Check if there's a repayment at disbursement transaction with fee portion
	const feeNetOffTx = transactions?.find(
		(t) =>
			t.type?.code === "loanTransactionType.repaymentAtDisbursement" &&
			(t.feeChargesPortion ?? 0) > 0 &&
			!t.manuallyReversed,
	);

	if (feeNetOffTx) return true;

	// Also check summary for fee charges due at disbursement
	const summary = loan.summary;
	if (summary?.feeChargesDueAtDisbursementCharged) {
		return summary.feeChargesDueAtDisbursementCharged > 0;
	}

	return false;
}

/**
 * Fees summary for charges tab
 */
export interface FeeSettlementSummary {
	/** Total fees deducted at disbursement */
	feesDeductedAtDisbursement: number;
	/** Total fees charged */
	totalFeesCharged: number;
	/** Total fees paid */
	totalFeesPaid: number;
	/** Total fees outstanding */
	totalFeesOutstanding: number;
	/** Whether fees were settled via net-off */
	settledViaNetOff: boolean;
}

/**
 * Get fee settlement summary for charges tab
 */
export function getFeeSettlementSummary(
	loan: GetLoansLoanIdResponse | undefined,
	transactions: GetLoansLoanIdTransactions[] | undefined,
): FeeSettlementSummary | null {
	if (!loan) return null;

	const summary = loan.summary;
	const hasNetOff = hasUpfrontFeesNetOff(loan, transactions);

	return {
		feesDeductedAtDisbursement:
			summary?.feeChargesDueAtDisbursementCharged ?? 0,
		totalFeesCharged: summary?.feeChargesCharged ?? 0,
		totalFeesPaid: summary?.feeChargesPaid ?? 0,
		totalFeesOutstanding: summary?.feeChargesOutstanding ?? 0,
		settledViaNetOff: hasNetOff,
	};
}
