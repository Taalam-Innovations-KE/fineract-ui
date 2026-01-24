"use client";

import { Edit2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LoanApplicationInput } from "@/lib/schemas/loan-application";

interface Client {
	id: number;
	displayName?: string;
	fullname?: string;
	accountNo?: string;
}

interface LoanProduct {
	id: number;
	name?: string;
	currency?: { code?: string; displaySymbol?: string };
}

interface ProductCharge {
	id: number;
	name?: string;
	amount?: number;
	chargeCalculationType?: { id?: number; value?: string };
}

interface LoanReviewStepProps {
	clients: Client[];
	products: LoanProduct[];
	availableCharges: ProductCharge[];
	onEditStep: (step: number) => void;
}

const FREQUENCY_LABELS: Record<number, string> = {
	0: "Days",
	1: "Weeks",
	2: "Months",
	3: "Years",
};

function formatCurrency(amount: number | undefined, symbol = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return "—";
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
}

function Section({
	title,
	stepIndex,
	onEdit,
	children,
}: {
	title: string;
	stepIndex: number;
	onEdit: (step: number) => void;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<h4 className="text-sm font-medium">{title}</h4>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => onEdit(stepIndex)}
				>
					<Edit2 className="h-3 w-3 mr-1" />
					Edit
				</Button>
			</div>
			<div className="bg-muted/50 rounded-md p-3 text-sm">{children}</div>
		</div>
	);
}

export function LoanReviewStep({
	clients,
	products,
	availableCharges,
	onEditStep,
}: LoanReviewStepProps) {
	const form = useFormContext<LoanApplicationInput>();
	const values = form.getValues();

	const client = clients.find((c) => c.id === values.clientId);
	const product = products.find((p) => p.id === values.productId);
	const currency =
		product?.currency?.displaySymbol || product?.currency?.code || "KES";

	const selectedCharges = (values.charges || []).map((c) => ({
		...c,
		charge: availableCharges.find((ac) => ac.id === c.chargeId),
	}));

	const hasGracePeriods =
		values.graceOnPrincipalPayment ||
		values.graceOnInterestPayment ||
		values.graceOnInterestCharged ||
		values.graceOnArrearsAgeing;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Review Loan Application</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Client & Product */}
				<Section title="Client & Product" stepIndex={0} onEdit={onEditStep}>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<span className="text-muted-foreground">Client:</span>
							<br />
							<span className="font-medium">
								{client?.displayName || client?.fullname || "Not selected"}
							</span>
							{client?.accountNo && (
								<span className="text-muted-foreground ml-1">
									({client.accountNo})
								</span>
							)}
						</div>
						<div>
							<span className="text-muted-foreground">Loan Product:</span>
							<br />
							<span className="font-medium">
								{product?.name || "Not selected"}
							</span>
						</div>
					</div>
				</Section>

				<Separator />

				{/* Loan Terms */}
				<Section title="Loan Terms" stepIndex={1} onEdit={onEditStep}>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<span className="text-muted-foreground">Principal:</span>
							<br />
							<span className="font-medium font-mono">
								{formatCurrency(values.principal, currency)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Repayments:</span>
							<br />
							<span className="font-medium">
								{values.numberOfRepayments || "—"} repayments
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Interest Rate:</span>
							<br />
							<span className="font-medium">
								{values.interestRatePerPeriod ?? "—"}% per period
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">
								Repayment Frequency:
							</span>
							<br />
							<span className="font-medium">
								Every {values.repaymentEvery || 1}{" "}
								{FREQUENCY_LABELS[values.repaymentFrequencyType ?? 2] ||
									"Months"}
							</span>
						</div>
					</div>
				</Section>

				<Separator />

				{/* Charges */}
				<Section title="Charges" stepIndex={2} onEdit={onEditStep}>
					{selectedCharges.length === 0 ? (
						<p className="text-muted-foreground">No charges selected</p>
					) : (
						<div className="space-y-2">
							{selectedCharges.map((c, index) => (
								<div key={index} className="flex items-center justify-between">
									<span>{c.charge?.name || `Charge #${c.chargeId}`}</span>
									<span className="font-mono">
										{c.charge?.chargeCalculationType?.value === "Flat"
											? formatCurrency(c.amount, currency)
											: `${c.amount}%`}
									</span>
								</div>
							))}
						</div>
					)}
				</Section>

				<Separator />

				{/* Grace Periods */}
				<Section title="Grace Periods" stepIndex={3} onEdit={onEditStep}>
					{!hasGracePeriods ? (
						<p className="text-muted-foreground">No grace periods configured</p>
					) : (
						<div className="grid grid-cols-2 gap-3">
							{values.graceOnPrincipalPayment !== undefined &&
								values.graceOnPrincipalPayment > 0 && (
									<div>
										<span className="text-muted-foreground">
											Grace on Principal:
										</span>
										<br />
										<span className="font-medium">
											{values.graceOnPrincipalPayment} periods
										</span>
									</div>
								)}
							{values.graceOnInterestPayment !== undefined &&
								values.graceOnInterestPayment > 0 && (
									<div>
										<span className="text-muted-foreground">
											Grace on Interest Payment:
										</span>
										<br />
										<span className="font-medium">
											{values.graceOnInterestPayment} periods
										</span>
									</div>
								)}
							{values.graceOnInterestCharged !== undefined &&
								values.graceOnInterestCharged > 0 && (
									<div>
										<span className="text-muted-foreground">
											Grace on Interest Charged:
										</span>
										<br />
										<span className="font-medium">
											{values.graceOnInterestCharged} periods
										</span>
									</div>
								)}
							{values.graceOnArrearsAgeing !== undefined &&
								values.graceOnArrearsAgeing > 0 && (
									<div>
										<span className="text-muted-foreground">
											Grace on Arrears:
										</span>
										<br />
										<span className="font-medium">
											{values.graceOnArrearsAgeing} days
										</span>
									</div>
								)}
						</div>
					)}
				</Section>

				<Separator />

				{/* Dates */}
				<Section title="Dates & Reference" stepIndex={5} onEdit={onEditStep}>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<span className="text-muted-foreground">Submitted On:</span>
							<br />
							<span className="font-medium">
								{formatDate(values.submittedOnDate)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">
								Expected Disbursement:
							</span>
							<br />
							<span className="font-medium">
								{formatDate(values.expectedDisbursementDate)}
							</span>
						</div>
						{values.repaymentsStartingFromDate && (
							<div>
								<span className="text-muted-foreground">First Repayment:</span>
								<br />
								<span className="font-medium">
									{formatDate(values.repaymentsStartingFromDate)}
								</span>
							</div>
						)}
						{values.externalId && (
							<div>
								<span className="text-muted-foreground">External ID:</span>
								<br />
								<span className="font-medium">{values.externalId}</span>
							</div>
						)}
					</div>
				</Section>
			</CardContent>
		</Card>
	);
}
