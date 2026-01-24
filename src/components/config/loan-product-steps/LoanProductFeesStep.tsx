"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetLoanProductsChargeOptions,
	GetLoanProductsTemplateResponse,
	PostChargesResponse,
} from "@/lib/fineract/generated/types.gen";
import { chargesApi } from "@/lib/fineract/loan-products";
import {
	type CreateLoanProductFormData,
	type FeeFormData,
	type FeeSelection,
	feeChargeFormSchema,
} from "@/lib/schemas/loan-product";
import { useTenantStore } from "@/store/tenant";

interface LoanProductFeesStepProps {
	template?: GetLoanProductsTemplateResponse;
	currencyCode?: string;
}

type FeeItem = FeeSelection & { summary?: string };

function toAmountLabel(
	amount?: number,
	currencyCode?: string,
	calculation?: "flat" | "percent",
) {
	if (amount === undefined) return "Amount not set";

	if (calculation === "percent") {
		return `${amount}%`;
	}

	if (!currencyCode) {
		return `${amount}`;
	}

	return `${currencyCode} ${amount}`;
}

function formatFeeSummary(fee: FeeItem, currencyCode?: string) {
	if (fee.summary) return fee.summary;

	const amountLabel = toAmountLabel(
		fee.amount,
		fee.currencyCode || currencyCode,
		fee.calculationMethod,
	);
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

export function LoanProductFeesStep({
	template,
	currencyCode,
}: LoanProductFeesStepProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const { control } = useFormContext<CreateLoanProductFormData>();

	// Use useFieldArray for fees array from parent form
	const { fields, append, remove } = useFieldArray({
		control,
		name: "fees",
	});

	const [isFeeDrawerOpen, setIsFeeDrawerOpen] = useState(false);
	const [isFeeSelectOpen, setIsFeeSelectOpen] = useState(false);
	const [feeSubmitError, setFeeSubmitError] = useState<string | null>(null);
	const [isCreatingFee, setIsCreatingFee] = useState(false);

	// Separate form for creating new fees (API call)
	const feeForm = useForm<FeeFormData>({
		resolver: zodResolver(feeChargeFormSchema),
		mode: "onChange",
		defaultValues: {
			calculationMethod: "flat",
			chargeTimeType: "disbursement",
			paymentMode: "deduct",
			currencyCode: currencyCode || "KES",
		},
	});

	useEffect(() => {
		feeForm.setValue("currencyCode", currencyCode || "KES");
	}, [currencyCode, feeForm]);

	useEffect(() => {
		if (isFeeDrawerOpen) {
			setFeeSubmitError(null);
		}
	}, [isFeeDrawerOpen]);

	const handleCreateFee = feeForm.handleSubmit(async (values) => {
		setFeeSubmitError(null);
		setIsCreatingFee(true);
		try {
			const payload = {
				name: values.name,
				currencyCode: values.currencyCode,
				amount: values.amount,
				chargeAppliesTo: 1, // Loan charges
				chargeTimeType:
					values.chargeTimeType === "disbursement"
						? 1
						: values.chargeTimeType === "specifiedDueDate"
							? 9
							: 0,
				chargeCalculationType: values.calculationMethod === "flat" ? 1 : 2,
				chargePaymentMode: values.paymentMode === "deduct" ? 0 : 1,
				active: true,
				penalty: false,
				locale: "en",
			};

			const response = (await chargesApi.create(
				tenantId,
				payload,
			)) as PostChargesResponse;
			const chargeId = response.resourceId;

			if (!chargeId) {
				throw new Error("Charge ID missing from response");
			}

			// Add to parent form via useFieldArray
			append({
				id: chargeId,
				name: values.name,
				amount: values.amount,
				currencyCode: values.currencyCode,
				calculationMethod: values.calculationMethod,
				chargeTimeType: values.chargeTimeType,
				paymentMode: values.paymentMode,
			});

			feeForm.reset({
				calculationMethod: "flat",
				chargeTimeType: "disbursement",
				paymentMode: "deduct",
				currencyCode: values.currencyCode,
				amount: undefined,
				name: "",
			});
			setIsFeeDrawerOpen(false);

			// Refresh template to include newly created fee in select options
			queryClient.invalidateQueries({
				queryKey: ["loanProductTemplate", tenantId],
			});
		} catch (error) {
			const mapped = mapFineractError(error);
			setFeeSubmitError(mapped.message);
		} finally {
			setIsCreatingFee(false);
		}
	});

	const handleAddExistingFee = (option: GetLoanProductsChargeOptions) => {
		if (!option?.id || typeof option.id !== "number") return;
		if (fields.some((fee) => fee.id === option.id)) return;

		append({
			id: option.id,
			name: option.name || "Fee",
			amount: option.amount,
			currencyCode: option.currency?.code,
		});
	};

	const chargeOptions = template?.chargeOptions || [];
	// Fees are charges that are NOT penalties (penalty is false or undefined)
	const feeOptions = chargeOptions.filter(
		(option) => option.penalty !== true && option.active !== false,
	);

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<CardTitle>Fees</CardTitle>
					<CardDescription>
						Fees charged before or at disbursement.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Fees can be deducted immediately when the loan is disbursed or
						billed separately depending on configuration.
					</p>

					<div className="flex flex-wrap gap-2">
						{fields.length === 0 && (
							<span className="text-xs text-muted-foreground">
								No fees selected yet.
							</span>
						)}
						{fields.map((fee, index) => (
							<Badge
								key={fee.id}
								variant="outline"
								className="flex items-center gap-2"
							>
								<span>{formatFeeSummary(fee as FeeItem, currencyCode)}</span>
								<button type="button" onClick={() => remove(index)}>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsFeeDrawerOpen(true)}
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Fee
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsFeeSelectOpen(true)}
						>
							Select Existing Fee
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Create Fee Drawer */}
			<Sheet open={isFeeDrawerOpen} onOpenChange={setIsFeeDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Create New Fee</SheetTitle>
						<SheetDescription>
							Define a new fee charge for this loan product.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<form onSubmit={handleCreateFee} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="fee-name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="fee-name"
									{...feeForm.register("name")}
									placeholder="e.g. Processing Fee"
								/>
								{feeForm.formState.errors.name && (
									<p className="text-sm text-destructive">
										{String(feeForm.formState.errors.name.message)}
									</p>
								)}
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="fee-amount">
										Amount <span className="text-destructive">*</span>
									</Label>
									<Input
										id="fee-amount"
										type="number"
										step="0.01"
										{...feeForm.register("amount", { valueAsNumber: true })}
										placeholder="100"
									/>
									{feeForm.formState.errors.amount && (
										<p className="text-sm text-destructive">
											{String(feeForm.formState.errors.amount.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="fee-calculation">
										Calculation Method{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Select
										value={feeForm.watch("calculationMethod")}
										onValueChange={(value) =>
											feeForm.setValue(
												"calculationMethod",
												value as "flat" | "percent",
											)
										}
									>
										<SelectTrigger id="fee-calculation">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="flat">Flat Amount</SelectItem>
											<SelectItem value="percent">Percentage</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="fee-time">
										Charge Time <span className="text-destructive">*</span>
									</Label>
									<Select
										value={feeForm.watch("chargeTimeType")}
										onValueChange={(value) =>
											feeForm.setValue(
												"chargeTimeType",
												value as
													| "disbursement"
													| "specifiedDueDate"
													| "approval",
											)
										}
									>
										<SelectTrigger id="fee-time">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="disbursement">
												At Disbursement
											</SelectItem>
											<SelectItem value="specifiedDueDate">
												On Specified Due Date
											</SelectItem>
											<SelectItem value="approval">On Approval</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="fee-payment">
										Payment Mode <span className="text-destructive">*</span>
									</Label>
									<Select
										value={feeForm.watch("paymentMode")}
										onValueChange={(value) =>
											feeForm.setValue(
												"paymentMode",
												value as "deduct" | "payable",
											)
										}
									>
										<SelectTrigger id="fee-payment">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="deduct">
												Deduct from Disbursement
											</SelectItem>
											<SelectItem value="payable">
												Payable Separately
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							{feeSubmitError && (
								<Alert variant="destructive">
									<AlertTitle>Failed to create fee</AlertTitle>
									<AlertDescription>{feeSubmitError}</AlertDescription>
								</Alert>
							)}

							<div className="flex items-center justify-end gap-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsFeeDrawerOpen(false)}
									disabled={isCreatingFee}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isCreatingFee}>
									{isCreatingFee ? "Creating..." : "Create Fee"}
								</Button>
							</div>
						</form>
					</div>
				</SheetContent>
			</Sheet>

			{/* Select Existing Fee Drawer */}
			<Sheet open={isFeeSelectOpen} onOpenChange={setIsFeeSelectOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Select Existing Fee</SheetTitle>
						<SheetDescription>
							Choose from existing fee charges.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6 space-y-4">
						{feeOptions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No existing fees available.
							</p>
						) : (
							feeOptions.map((option) => (
								<div
									key={option.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div>
										<p className="font-medium">{option.name}</p>
										<p className="text-sm text-muted-foreground">
											{option.currency?.code} {option.amount} -{" "}
											{option.chargeTimeType?.description}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											handleAddExistingFee(option);
											setIsFeeSelectOpen(false);
										}}
										disabled={fields.some((fee) => fee.id === option.id)}
									>
										{fields.some((fee) => fee.id === option.id)
											? "Added"
											: "Add"}
									</Button>
								</div>
							))
						)}
					</div>
				</SheetContent>
			</Sheet>
		</TooltipProvider>
	);
}
