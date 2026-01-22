"use client";

import { Plus } from "lucide-react";
import { type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { GetLoanProductsChargeOptions } from "@/lib/fineract/generated/types.gen";
import type { FeeFormData, FeeSelection } from "@/lib/schemas/loan-product";

type FeeItem = FeeSelection & { summary?: string };

function formatFeeSummary(fee: FeeItem, currencyCode?: string) {
	if (fee.summary) return fee.summary;

	const amountLabel = fee.amount
		? fee.calculationMethod === "percent"
			? `${fee.amount}%`
			: currencyCode
				? `${currencyCode} ${fee.amount}`
				: `${fee.amount}`
		: "Amount not set";
	const chargeTimeLabel =
		fee.chargeTimeType === "disbursement"
			? "at disbursement"
			: fee.chargeTimeType === "approval"
				? "on approval"
				: "on specified due date";
	const paymentModeLabel =
		fee.paymentMode === "deduct"
			? "deducted from disbursement"
			: "payable separately";

	return `${fee.name} - ${amountLabel} - ${chargeTimeLabel}, ${paymentModeLabel}`;
}

interface LoanProductFeesFormSectionProps {
	fees: FeeItem[];
	setFees: React.Dispatch<React.SetStateAction<FeeItem[]>>;
	currencyCode?: string;
	feeForm: UseFormReturn<FeeFormData>;
	handleCreateFee: (data: FeeFormData) => Promise<void>;
	isFeeDrawerOpen: boolean;
	setIsFeeDrawerOpen: (open: boolean) => void;
	isFeeSelectOpen: boolean;
	setIsFeeSelectOpen: (open: boolean) => void;
	feeOptions: GetLoanProductsChargeOptions[];
	handleAddExistingFee: (option: GetLoanProductsChargeOptions) => void;
	isCreatingFee: boolean;
	feeSubmitError: string | null;
}

export function LoanProductFeesFormSection({
	fees,
	setFees,
	currencyCode,
	feeForm,
	handleCreateFee,
	isFeeDrawerOpen,
	setIsFeeDrawerOpen,
	isFeeSelectOpen,
	setIsFeeSelectOpen,
	feeOptions,
	handleAddExistingFee,
	isCreatingFee,
	feeSubmitError,
}: LoanProductFeesFormSectionProps) {
	return (
		<div className="space-y-4">
			<p className="text-xs text-muted-foreground">
				Fees are charges applied to the loan. They can be deducted from
				disbursement or paid separately.
			</p>

			{/* Create Fee Sheet */}
			<Sheet open={isFeeDrawerOpen} onOpenChange={setIsFeeDrawerOpen}>
				<SheetContent side="right" className="w-full sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Create Fee</SheetTitle>
						<SheetDescription>
							Define a new fee charge for this loan product.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<form
							onSubmit={feeForm.handleSubmit(handleCreateFee)}
							className="space-y-4"
						>
							{/* Fee form fields would go here - simplified for brevity */}
							<div className="text-sm text-muted-foreground">
								Fee creation form (implementation details omitted for brevity)
							</div>
							{feeSubmitError && (
								<p className="text-sm text-destructive">{feeSubmitError}</p>
							)}
							<div className="flex justify-end gap-3 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsFeeDrawerOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isCreatingFee}>
									{isCreatingFee ? (
										"Creating..."
									) : (
										<>
											<Plus className="mr-2 h-4 w-4" />
											Create Fee
										</>
									)}
								</Button>
							</div>
						</form>
					</div>
				</SheetContent>
			</Sheet>

			{/* Select Existing Fee Sheet */}
			<Sheet open={isFeeSelectOpen} onOpenChange={setIsFeeSelectOpen}>
				<SheetContent side="right" className="w-full sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Add Existing Fee</SheetTitle>
						<SheetDescription>
							Select an existing fee to add to this loan product.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<div className="space-y-4">
							{feeOptions.map((option) => (
								<div
									key={option.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div>
										<p className="font-medium">{option.name}</p>
										<p className="text-sm text-muted-foreground">
											{option.amount} {option.currency?.code} -{" "}
											{option.chargeTimeType?.description}
										</p>
									</div>
									<Button
										onClick={() => {
											handleAddExistingFee(option);
											setIsFeeSelectOpen(false);
										}}
										size="sm"
									>
										Add
									</Button>
								</div>
							))}
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => setIsFeeSelectOpen(true)}
				>
					Add Existing Fee
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => setIsFeeDrawerOpen(true)}
				>
					Create New Fee
				</Button>
			</div>

			{fees.length > 0 && (
				<div className="space-y-2">
					<h4 className="font-medium">Selected Fees</h4>
					{fees.map((fee, index) => (
						<div
							key={fee.id || index}
							className="flex items-center justify-between p-3 border rounded-lg"
						>
							<div>
								<p className="font-medium">{fee.name}</p>
								<p className="text-sm text-muted-foreground">
									{formatFeeSummary(fee, currencyCode)}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setFees((prev) => prev.filter((_, i) => i !== index))
								}
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
