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
	type PenaltyFormData,
	type PenaltySelection,
	penaltyChargeFormSchema,
} from "@/lib/schemas/loan-product";
import { useTenantStore } from "@/store/tenant";

interface LoanProductPenaltiesStepProps {
	template?: GetLoanProductsTemplateResponse;
	currencyCode?: string;
}

type PenaltyItem = PenaltySelection & {
	summary?: string;
	gracePeriodOverride?: number;
};

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

function formatPenaltySummary(penalty: PenaltyItem, currencyCode?: string) {
	if (penalty.summary) return penalty.summary;

	const amountLabel = toAmountLabel(
		penalty.amount,
		penalty.currencyCode || currencyCode,
		penalty.calculationMethod,
	);
	const basisLabel =
		penalty.penaltyBasis === "overduePrincipal"
			? "overdue principal"
			: penalty.penaltyBasis === "overdueInterest"
				? "overdue interest"
				: "entire overdue amount";

	const graceLabel = penalty.gracePeriodOverride
		? ` after ${penalty.gracePeriodOverride} grace days`
		: "";

	return `${penalty.name} - ${amountLabel} on ${basisLabel}${graceLabel}`;
}

export function LoanProductPenaltiesStep({
	template,
	currencyCode,
}: LoanProductPenaltiesStepProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const { control } = useFormContext<CreateLoanProductFormData>();

	// Use useFieldArray for penalties array from parent form
	const { fields, append, remove } = useFieldArray({
		control,
		name: "penalties",
	});

	const [isPenaltyDrawerOpen, setIsPenaltyDrawerOpen] = useState(false);
	const [isPenaltySelectOpen, setIsPenaltySelectOpen] = useState(false);
	const [penaltySubmitError, setPenaltySubmitError] = useState<string | null>(
		null,
	);
	const [isCreatingPenalty, setIsCreatingPenalty] = useState(false);

	// Separate form for creating new penalties (API call)
	const penaltyForm = useForm<PenaltyFormData>({
		resolver: zodResolver(penaltyChargeFormSchema),
		mode: "onChange",
		defaultValues: {
			calculationMethod: "percent",
			penaltyBasis: "totalOverdue",
			currencyCode: currencyCode || "KES",
		},
	});

	useEffect(() => {
		penaltyForm.setValue("currencyCode", currencyCode || "KES");
	}, [currencyCode, penaltyForm]);

	useEffect(() => {
		if (isPenaltyDrawerOpen) {
			setPenaltySubmitError(null);
		}
	}, [isPenaltyDrawerOpen]);

	const handleCreatePenalty = penaltyForm.handleSubmit(async (values) => {
		setPenaltySubmitError(null);
		setIsCreatingPenalty(true);
		try {
			// Map calculation type based on penalty basis
			let chargeCalculationType: number;
			if (values.calculationMethod === "flat") {
				chargeCalculationType = 1; // Flat
			} else if (values.penaltyBasis === "overduePrincipal") {
				chargeCalculationType = 4; // Percent of principal
			} else if (values.penaltyBasis === "overdueInterest") {
				chargeCalculationType = 3; // Percent of interest
			} else {
				chargeCalculationType = 2; // Percent
			}

			const payload = {
				name: values.name,
				currencyCode: values.currencyCode,
				amount: values.amount,
				chargeAppliesTo: 1, // Loan charges
				chargeTimeType: 4, // Overdue installment charge - correct for penalties
				chargeCalculationType,
				penalty: true,
				chargePaymentMode: 1, // Payable separately (penalties are paid explicitly)
				active: true, // Penalties should be active by default
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
				penaltyBasis: values.penaltyBasis,
			});

			penaltyForm.reset({
				calculationMethod: "percent",
				penaltyBasis: "totalOverdue",
				currencyCode: values.currencyCode,
				amount: undefined,
				name: "",
				gracePeriodOverride: undefined,
			});
			setIsPenaltyDrawerOpen(false);

			// Refresh template to include newly created penalty in select options
			queryClient.invalidateQueries({
				queryKey: ["loanProductTemplate", tenantId],
			});
		} catch (error) {
			const mapped = mapFineractError(error);
			setPenaltySubmitError(mapped.message);
		} finally {
			setIsCreatingPenalty(false);
		}
	});

	const handleAddExistingPenalty = (option: GetLoanProductsChargeOptions) => {
		if (!option?.id || typeof option.id !== "number") return;
		if (fields.some((penalty) => penalty.id === option.id)) return;
		if (
			currencyCode &&
			option.currency?.code &&
			option.currency.code !== currencyCode
		) {
			return;
		}

		append({
			id: option.id,
			name: option.name || "Penalty",
			amount: option.amount,
			currencyCode: option.currency?.code,
		});
	};

	const chargeOptions = template?.chargeOptions || [];
	const penaltyOptions = chargeOptions.filter(
		(option) => option.penalty === true && option.active !== false,
	);
	const matchingCurrencyPenaltyOptions = penaltyOptions.filter((option) => {
		if (!currencyCode) return true;
		return option.currency?.code === currencyCode;
	});
	const excludedPenaltyCount =
		penaltyOptions.length - matchingCurrencyPenaltyOptions.length;

	return (
		<TooltipProvider>
			<Card>
				<CardHeader>
					<CardTitle>Penalties</CardTitle>
					<CardDescription>
						Late payment penalties based on overdue balances.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xs text-muted-foreground">
						Penalties are charged when installments become overdue and are
						marked as penalties in Fineract.
					</p>

					<div className="flex flex-wrap gap-2">
						{fields.length === 0 && (
							<span className="text-xs text-muted-foreground">
								No penalties selected yet.
							</span>
						)}
						{fields.map((penalty, index) => (
							<Badge
								key={penalty.id}
								variant="outline"
								className="flex items-center gap-2"
							>
								<span>
									{formatPenaltySummary(penalty as PenaltyItem, currencyCode)}
								</span>
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
							onClick={() => setIsPenaltyDrawerOpen(true)}
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Penalty
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsPenaltySelectOpen(true)}
						>
							Select Existing Penalty
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Create Penalty Drawer */}
			<Sheet open={isPenaltyDrawerOpen} onOpenChange={setIsPenaltyDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Create New Penalty</SheetTitle>
						<SheetDescription>
							Define a new penalty charge for this loan product.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<form onSubmit={handleCreatePenalty} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="penalty-name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="penalty-name"
									{...penaltyForm.register("name")}
									placeholder="e.g. Late Payment Penalty"
								/>
								{penaltyForm.formState.errors.name && (
									<p className="text-sm text-destructive">
										{String(penaltyForm.formState.errors.name.message)}
									</p>
								)}
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="penalty-amount">
										Amount <span className="text-destructive">*</span>
									</Label>
									<Input
										id="penalty-amount"
										type="number"
										step="0.01"
										{...penaltyForm.register("amount", { valueAsNumber: true })}
										placeholder="100"
									/>
									{penaltyForm.formState.errors.amount && (
										<p className="text-sm text-destructive">
											{String(penaltyForm.formState.errors.amount.message)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-calculation">
										Calculation Method{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Select
										value={penaltyForm.watch("calculationMethod")}
										onValueChange={(value) =>
											penaltyForm.setValue(
												"calculationMethod",
												value as "flat" | "percent",
											)
										}
									>
										<SelectTrigger id="penalty-calculation">
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
									<Label htmlFor="penalty-basis">
										Penalty Basis <span className="text-destructive">*</span>
									</Label>
									<Select
										value={penaltyForm.watch("penaltyBasis")}
										onValueChange={(value) =>
											penaltyForm.setValue(
												"penaltyBasis",
												value as
													| "totalOverdue"
													| "overduePrincipal"
													| "overdueInterest",
											)
										}
									>
										<SelectTrigger id="penalty-basis">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="totalOverdue">
												Total Overdue Amount
											</SelectItem>
											<SelectItem value="overduePrincipal">
												Overdue Principal
											</SelectItem>
											<SelectItem value="overdueInterest">
												Overdue Interest
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-grace">
										Grace Period Override (days)
									</Label>
									<Input
										id="penalty-grace"
										type="number"
										{...penaltyForm.register("gracePeriodOverride", {
											valueAsNumber: true,
										})}
										placeholder="0"
									/>
									<p className="text-xs text-muted-foreground">
										Optional grace period before penalty applies.
									</p>
								</div>
							</div>

							{penaltySubmitError && (
								<Alert variant="destructive">
									<AlertTitle>Failed to create penalty</AlertTitle>
									<AlertDescription>{penaltySubmitError}</AlertDescription>
								</Alert>
							)}

							<div className="flex items-center justify-end gap-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsPenaltyDrawerOpen(false)}
									disabled={isCreatingPenalty}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isCreatingPenalty}>
									{isCreatingPenalty ? "Creating..." : "Create Penalty"}
								</Button>
							</div>
						</form>
					</div>
				</SheetContent>
			</Sheet>

			{/* Select Existing Penalty Drawer */}
			<Sheet open={isPenaltySelectOpen} onOpenChange={setIsPenaltySelectOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>Select Existing Penalty</SheetTitle>
						<SheetDescription>
							Choose from existing penalty charges.
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6 space-y-4">
						{matchingCurrencyPenaltyOptions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No existing penalties available for currency{" "}
								{currencyCode || "N/A"}.
							</p>
						) : (
							matchingCurrencyPenaltyOptions.map((option) => (
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
											handleAddExistingPenalty(option);
											setIsPenaltySelectOpen(false);
										}}
										disabled={fields.some(
											(penalty) => penalty.id === option.id,
										)}
									>
										{fields.some((penalty) => penalty.id === option.id)
											? "Added"
											: "Add"}
									</Button>
								</div>
							))
						)}
						{excludedPenaltyCount > 0 && currencyCode && (
							<p className="text-xs text-muted-foreground">
								{excludedPenaltyCount} penalty charge(s) hidden due to currency
								mismatch.
							</p>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</TooltipProvider>
	);
}
