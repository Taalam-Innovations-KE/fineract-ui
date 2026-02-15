"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useFormContext } from "react-hook-form";
import type { input as ZodInput } from "zod";
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
import type {
	GetChargesResponse,
	GetLoanProductsChargeOptions,
	GetLoanProductsTemplateResponse,
	PostChargesResponse,
	PutChargesChargeIdRequest,
} from "@/lib/fineract/generated/types.gen";
import { chargesApi } from "@/lib/fineract/loan-products";
import { normalizeApiError } from "@/lib/fineract/ui-api-error";
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

type LoanTemplateWithPenaltyOptions = GetLoanProductsTemplateResponse & {
	penaltyOptions?: Array<GetLoanProductsChargeOptions>;
};

const OVERDUE_INSTALLMENT_CHARGE_TIME_TYPE = 9;
const GRACE_PERIOD_FREQUENCY_DAYS = 0;
const PENALTY_FREQUENCY_TO_API = {
	days: "0",
	weeks: "1",
	months: "2",
	years: "3",
} as const;
const LOAN_CHARGE_APPLIES_TO = 1;

type PenaltyFrequencyType = NonNullable<PenaltySelection["frequencyType"]>;
type PenaltyOption = GetLoanProductsChargeOptions & Record<string, unknown>;
type PenaltyFormInput = ZodInput<typeof penaltyChargeFormSchema>;

function readUnknownProperty(source: object, property: string) {
	const record = source as Record<string, unknown>;
	return record[property];
}

function readUnknownNumberProperty(source: object, property: string) {
	const value = readUnknownProperty(source, property);
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function mapApiPenaltyFrequencyToUi(
	value: unknown,
): PenaltyFrequencyType | undefined {
	if (typeof value === "number") {
		return mapApiPenaltyFrequencyToUi(String(value));
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "0" || normalized.includes("day")) return "days";
		if (normalized === "1" || normalized.includes("week")) return "weeks";
		if (normalized === "2" || normalized.includes("month")) return "months";
		if (normalized === "3" || normalized.includes("year")) return "years";
		return undefined;
	}

	if (value && typeof value === "object") {
		const objectValue = value as Record<string, unknown>;
		return (
			mapApiPenaltyFrequencyToUi(objectValue.id) ||
			mapApiPenaltyFrequencyToUi(objectValue.code) ||
			mapApiPenaltyFrequencyToUi(objectValue.value) ||
			mapApiPenaltyFrequencyToUi(objectValue.description)
		);
	}

	return undefined;
}

function mapChargeCalculationToPenaltyBasis(
	chargeCalculationTypeId?: number,
): PenaltySelection["penaltyBasis"] {
	if (chargeCalculationTypeId === 3) return "overdueInterest";
	if (chargeCalculationTypeId === 4) return "overduePrincipal";
	return "totalOverdue";
}

function mapChargeCalculationToMethod(
	chargeCalculationTypeId?: number,
): PenaltySelection["calculationMethod"] {
	return chargeCalculationTypeId === 1 ? "flat" : "percent";
}

function mapOptionToPenaltySelection(option: GetLoanProductsChargeOptions) {
	const chargeCalculationTypeId = option.chargeCalculationType?.id;
	const frequencyType = mapApiPenaltyFrequencyToUi(
		readUnknownProperty(option, "feeFrequency"),
	);
	const frequencyInterval = readUnknownNumberProperty(option, "feeInterval");
	const gracePeriodOverride =
		readUnknownNumberProperty(option, "restartCountFrequency") ??
		readUnknownNumberProperty(option, "restartFrequency");

	return {
		calculationMethod: mapChargeCalculationToMethod(chargeCalculationTypeId),
		penaltyBasis: mapChargeCalculationToPenaltyBasis(chargeCalculationTypeId),
		gracePeriodOverride,
		frequencyType,
		frequencyInterval,
	};
}

function formatOptionRecurrence(option: GetLoanProductsChargeOptions) {
	const frequencyType = mapApiPenaltyFrequencyToUi(
		readUnknownProperty(option, "feeFrequency"),
	);
	const frequencyInterval = readUnknownNumberProperty(option, "feeInterval");

	if (!frequencyType || !frequencyInterval) return null;
	return `Every ${frequencyInterval} ${frequencyType}`;
}

function normalizeChargeToPenaltyOption(
	charge: GetChargesResponse,
): PenaltyOption | null {
	if (!charge.id) return null;

	const option: PenaltyOption = {
		id: charge.id,
		name: charge.name,
		active: charge.active,
		penalty: charge.penalty,
		amount: charge.amount,
		currency: charge.currency
			? {
					code: charge.currency.code,
					decimalPlaces: charge.currency.decimalPlaces,
					displayLabel: charge.currency.displayLabel,
					displaySymbol: charge.currency.displaySymbol,
					name: charge.currency.name,
					nameCode: charge.currency.nameCode,
				}
			: undefined,
		chargeTimeType: charge.chargeTimeType
			? {
					id: charge.chargeTimeType.id,
					code: charge.chargeTimeType.code,
					description: charge.chargeTimeType.description,
				}
			: undefined,
		chargeAppliesTo: charge.chargeAppliesTo
			? {
					id: charge.chargeAppliesTo.id,
					code: charge.chargeAppliesTo.code,
					description: charge.chargeAppliesTo.description,
				}
			: undefined,
		chargeCalculationType: charge.chargeCalculationType
			? {
					id: charge.chargeCalculationType.id,
					code: charge.chargeCalculationType.code,
					description: charge.chargeCalculationType.description,
				}
			: undefined,
		chargePaymentMode: charge.chargePaymentMode
			? {
					id: charge.chargePaymentMode.id,
					code: charge.chargePaymentMode.code,
					description: charge.chargePaymentMode.description,
				}
			: undefined,
	};

	option.feeFrequency = readUnknownProperty(charge, "feeFrequency");
	option.feeInterval = readUnknownNumberProperty(charge, "feeInterval");
	option.restartCountFrequency = readUnknownNumberProperty(
		charge,
		"restartCountFrequency",
	);
	option.restartFrequency = readUnknownNumberProperty(
		charge,
		"restartFrequency",
	);

	return option;
}

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
	const recurrenceLabel =
		penalty.frequencyType && penalty.frequencyInterval
			? ` every ${penalty.frequencyInterval} ${penalty.frequencyType}`
			: "";

	return `${penalty.name} - ${amountLabel} on ${basisLabel}${graceLabel}${recurrenceLabel}`;
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
		keyName: "fieldId",
	});

	const [isPenaltyDrawerOpen, setIsPenaltyDrawerOpen] = useState(false);
	const [isPenaltySelectOpen, setIsPenaltySelectOpen] = useState(false);
	const [penaltySubmitError, setPenaltySubmitError] = useState<string | null>(
		null,
	);
	const [isCreatingPenalty, setIsCreatingPenalty] = useState(false);
	const chargesQuery = useQuery({
		queryKey: ["charges", tenantId],
		queryFn: async () =>
			(await chargesApi.list(tenantId)) as Array<GetChargesResponse>,
		enabled: isPenaltySelectOpen,
		staleTime: 1000 * 60 * 5,
	});

	// Separate form for creating new penalties (API call)
	const penaltyForm = useForm<PenaltyFormInput, unknown, PenaltyFormData>({
		resolver: zodResolver(penaltyChargeFormSchema),
		mode: "onChange",
		defaultValues: {
			calculationMethod: "percent",
			penaltyBasis: "totalOverdue",
			currencyCode: currencyCode || "KES",
			frequencyType: undefined,
			frequencyInterval: undefined,
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
				chargeTimeType: OVERDUE_INSTALLMENT_CHARGE_TIME_TYPE,
				chargeCalculationType,
				penalty: true,
				chargePaymentMode: 1, // Payable separately (penalties are paid explicitly)
				active: true, // Penalties should be active by default
				feeFrequency: values.frequencyType
					? PENALTY_FREQUENCY_TO_API[values.frequencyType]
					: undefined,
				feeInterval:
					values.frequencyInterval !== undefined
						? String(values.frequencyInterval)
						: undefined,
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

			const gracePeriodOverride =
				values.gracePeriodOverride !== undefined &&
				values.gracePeriodOverride > 0
					? Math.trunc(values.gracePeriodOverride)
					: undefined;

			if (gracePeriodOverride !== undefined) {
				const gracePeriodPayload: PutChargesChargeIdRequest = {
					locale: "en",
					countFrequencyType: GRACE_PERIOD_FREQUENCY_DAYS,
					restartCountFrequency: gracePeriodOverride,
				};

				await chargesApi.update(tenantId, chargeId, gracePeriodPayload);
			}

			// Add to parent form via useFieldArray
			append({
				id: chargeId,
				name: values.name,
				amount: values.amount,
				currencyCode: values.currencyCode,
				calculationMethod: values.calculationMethod,
				penaltyBasis: values.penaltyBasis,
				gracePeriodOverride,
				frequencyType: values.frequencyType,
				frequencyInterval: values.frequencyInterval,
			});

			penaltyForm.reset({
				calculationMethod: "percent",
				penaltyBasis: "totalOverdue",
				currencyCode: values.currencyCode,
				amount: undefined,
				name: "",
				gracePeriodOverride: undefined,
				frequencyType: undefined,
				frequencyInterval: undefined,
			});
			setIsPenaltyDrawerOpen(false);

			// Refresh template to include newly created penalty in select options
			queryClient.invalidateQueries({
				queryKey: ["loanProductTemplate", tenantId],
			});
		} catch (error) {
			const mapped = normalizeApiError(error);
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
			...mapOptionToPenaltySelection(option),
		});
	};

	const chargeOptions = template?.chargeOptions || [];
	const templatePenaltyOptions =
		(template as LoanTemplateWithPenaltyOptions | undefined)?.penaltyOptions ||
		[];
	const templateOrChargePenaltyOptions =
		templatePenaltyOptions.length > 0
			? (templatePenaltyOptions.filter(
					(option) => option.active !== false,
				) as PenaltyOption[])
			: chargeOptions.filter(
					(option) => option.penalty === true && option.active !== false,
				);
	const penaltiesFromCharges = (chargesQuery.data || [])
		.filter(
			(charge) =>
				charge.penalty === true &&
				charge.active !== false &&
				charge.chargeAppliesTo?.id === LOAN_CHARGE_APPLIES_TO,
		)
		.map(normalizeChargeToPenaltyOption)
		.filter((option): option is PenaltyOption => option !== null);
	const penaltyOptions = Array.from(
		new Map(
			[...templateOrChargePenaltyOptions, ...penaltiesFromCharges].map(
				(option) => [option.id, option],
			),
		).values(),
	).filter((option) => option.id !== undefined);
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
								key={penalty.fieldId}
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

							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="penalty-frequency-type">
										Recurrence Frequency (optional)
									</Label>
									<Select
										value={penaltyForm.watch("frequencyType") || ""}
										onValueChange={(value) =>
											penaltyForm.setValue(
												"frequencyType",
												value === ""
													? undefined
													: (value as "days" | "weeks" | "months" | "years"),
											)
										}
									>
										<SelectTrigger id="penalty-frequency-type">
											<SelectValue placeholder="Select frequency" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="days">Days</SelectItem>
											<SelectItem value="weeks">Weeks</SelectItem>
											<SelectItem value="months">Months</SelectItem>
											<SelectItem value="years">Years</SelectItem>
										</SelectContent>
									</Select>
									{penaltyForm.formState.errors.frequencyType && (
										<p className="text-sm text-destructive">
											{String(
												penaltyForm.formState.errors.frequencyType.message,
											)}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="penalty-frequency-interval">
										Recurrence Interval
									</Label>
									<Input
										id="penalty-frequency-interval"
										type="number"
										min={1}
										{...penaltyForm.register("frequencyInterval", {
											valueAsNumber: true,
										})}
										placeholder="1"
									/>
									<p className="text-xs text-muted-foreground">
										For example: 1 day for daily penalties, 1 week for weekly.
									</p>
									{penaltyForm.formState.errors.frequencyInterval && (
										<p className="text-sm text-destructive">
											{String(
												penaltyForm.formState.errors.frequencyInterval.message,
											)}
										</p>
									)}
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
								<Button
									type="button"
									onClick={() => void handleCreatePenalty()}
									disabled={isCreatingPenalty}
								>
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
							matchingCurrencyPenaltyOptions.map((option) => {
								const recurrenceLabel = formatOptionRecurrence(option);
								return (
									<div
										key={option.id}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div>
											<p className="font-medium">{option.name}</p>
											<p className="text-sm text-muted-foreground">
												{option.currency?.code} {option.amount} -{" "}
												{option.chargeTimeType?.description ||
													option.chargeTimeType?.code ||
													"Penalty"}
												{recurrenceLabel ? ` (${recurrenceLabel})` : ""}
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
								);
							})
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
