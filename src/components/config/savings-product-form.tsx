"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	buildSavingsProductRequest,
	type SavingsProductRequestPayload,
	savingsProductsApi,
} from "@/lib/fineract/savings-products";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import {
	type SavingsProductFormData,
	savingsProductSchema,
} from "@/lib/schemas/savings-product";
import { useTenantStore } from "@/store/tenant";

type SelectOption = {
	id?: number;
	name?: string;
	value?: string;
};

interface SavingsProductFormProps {
	isOpen: boolean;
	isEditMode?: boolean;
	initialData?: Partial<SavingsProductFormData>;
	onSubmit: (payload: SavingsProductRequestPayload) => Promise<void>;
	onCancel: () => void;
}

function getOptionLabel(option: SelectOption): string {
	return option.name || option.value || "Unnamed";
}

function readUnknownBooleanProperty(source: object, property: string): boolean {
	const record = source as Record<string, unknown>;
	const value = record[property];
	return typeof value === "boolean" ? value : false;
}

function readUnknownNumberProperty(
	source: object,
	property: string,
): number | undefined {
	const record = source as Record<string, unknown>;
	const value = record[property];
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function SavingsProductFormSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Skeleton className="h-6 w-48" />
				</CardTitle>
				<Skeleton className="h-4 w-64" />
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 6 }).map((_, index) => (
						<div key={`identity-${index}`} className="space-y-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={`interest-${index}`} className="space-y-2">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
				<div className="flex justify-end gap-2">
					<Skeleton className="h-10 w-20" />
					<Skeleton className="h-10 w-28" />
				</div>
			</CardContent>
		</Card>
	);
}

function NumberField({
	name,
	label,
	placeholder,
	description,
	required,
	step,
	min,
}: {
	name: keyof SavingsProductFormData;
	label: string;
	placeholder?: string;
	description?: string;
	required?: boolean;
	step?: string;
	min?: string;
}) {
	const form = useFormContext<SavingsProductFormData>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>
						{label}
						{required && <span className="text-destructive">*</span>}
					</FormLabel>
					<FormControl>
						<Input
							type="number"
							step={step}
							min={min}
							placeholder={placeholder}
							value={field.value === undefined ? "" : String(field.value)}
							onChange={(event) => {
								const value = event.target.value;
								field.onChange(value === "" ? undefined : Number(value));
							}}
						/>
					</FormControl>
					{description ? (
						<FormDescription>{description}</FormDescription>
					) : null}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function SelectField({
	name,
	label,
	options,
	placeholder,
	required,
}: {
	name: keyof SavingsProductFormData;
	label: string;
	options: SelectOption[];
	placeholder: string;
	required?: boolean;
}) {
	const form = useFormContext<SavingsProductFormData>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>
						{label}
						{required && <span className="text-destructive">*</span>}
					</FormLabel>
					<Select
						value={
							field.value !== undefined && field.value !== null
								? String(field.value)
								: undefined
						}
						onValueChange={(value) => field.onChange(Number(value))}
					>
						<FormControl>
							<SelectTrigger>
								<SelectValue placeholder={placeholder} />
							</SelectTrigger>
						</FormControl>
						<SelectContent>
							{options
								.filter((option) => option.id !== undefined)
								.map((option) => (
									<SelectItem key={option.id} value={String(option.id)}>
										{getOptionLabel(option)}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

export function SavingsProductForm({
	isOpen,
	isEditMode = false,
	initialData,
	onSubmit,
	onCancel,
}: SavingsProductFormProps) {
	const { tenantId } = useTenantStore();
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const templateQuery = useQuery({
		queryKey: ["savingsProductTemplate", tenantId],
		queryFn: () => savingsProductsApi.getTemplate(tenantId),
		enabled: isOpen,
		staleTime: 1000 * 60 * 5,
	});

	const template = templateQuery.data;

	const defaultValues: SavingsProductFormData = {
		name: "",
		shortName: "",
		description: "",
		currencyCode: "",
		digitsAfterDecimal: 2,
		inMultiplesOf: 1,
		nominalAnnualInterestRate: 0,
		interestCompoundingPeriodType: 1,
		interestPostingPeriodType: 4,
		interestCalculationType: 1,
		interestCalculationDaysInYearType: 365,
		accountingRule: 1,
		withdrawalFeeForTransfers: false,
		withHoldTax: false,
		allowOverdraft: false,
		isDormancyTrackingActive: false,
		lockinPeriodFrequency: undefined,
		lockinPeriodFrequencyType: undefined,
		savingsReferenceAccountId: undefined,
		savingsControlAccountId: undefined,
		interestOnSavingsAccountId: undefined,
		incomeFromFeeAccountId: undefined,
		transfersInSuspenseAccountId: undefined,
		incomeFromPenaltyAccountId: undefined,
		overdraftPortfolioControlId: undefined,
		incomeFromInterestId: undefined,
		writeOffAccountId: undefined,
		feesReceivableAccountId: undefined,
		penaltiesReceivableAccountId: undefined,
		interestPayableAccountId: undefined,
		paymentChannelToFundSourceMappings: [],
		...initialData,
		charges: initialData?.charges ?? [],
		paymentChannelToFundSourceMappings:
			initialData?.paymentChannelToFundSourceMappings ?? [],
	};

	const form = useForm<SavingsProductFormData>({
		resolver: zodResolver(
			savingsProductSchema,
		) as Resolver<SavingsProductFormData>,
		mode: "onChange",
		defaultValues,
	});

	const currencyOptions = useMemo(
		() => template?.currencyOptions || [],
		[template],
	);
	const accountingRuleOptions = useMemo(
		() => template?.accountingRuleOptions || [],
		[template],
	);
	const interestCompoundingOptions = useMemo(
		() => template?.interestCompoundingPeriodTypeOptions || [],
		[template],
	);
	const interestPostingOptions = useMemo(
		() => template?.interestPostingPeriodTypeOptions || [],
		[template],
	);
	const interestCalculationOptions = useMemo(
		() => template?.interestCalculationTypeOptions || [],
		[template],
	);
	const interestDaysInYearOptions = useMemo(
		() => template?.interestCalculationDaysInYearTypeOptions || [],
		[template],
	);
	const lockinFrequencyOptions = useMemo(
		() => template?.lockinPeriodFrequencyTypeOptions || [],
		[template],
	);
	const chargeOptions = useMemo(
		() => template?.chargeOptions || [],
		[template],
	);
	const paymentTypeOptions = useMemo(
		() => template?.paymentTypeOptions || [],
		[template],
	);

	const accountingMappingOptions = template?.accountingMappingOptions;
	const assetAccountOptions =
		accountingMappingOptions?.assetAccountOptions || [];
	const liabilityAccountOptions =
		accountingMappingOptions?.liabilityAccountOptions || [];
	const incomeAccountOptions =
		accountingMappingOptions?.incomeAccountOptions || [];
	const expenseAccountOptions =
		accountingMappingOptions?.expenseAccountOptions || [];

	const accountingRule = form.watch("accountingRule");
	const selectedCurrencyCode = form.watch("currencyCode");

	useEffect(() => {
		if (!template || isEditMode || form.formState.isDirty) {
			return;
		}

		if (template.currencyOptions?.[0]?.code) {
			form.setValue("currencyCode", template.currencyOptions[0].code);
			form.setValue(
				"digitsAfterDecimal",
				template.currencyOptions[0].decimalPlaces ?? 2,
			);
			form.setValue(
				"inMultiplesOf",
				readUnknownNumberProperty(
					template.currencyOptions[0],
					"inMultiplesOf",
				) ?? 1,
			);
		}

		form.setValue(
			"interestCompoundingPeriodType",
			template.interestCompoundingPeriodType?.id ?? 1,
		);
		form.setValue(
			"interestPostingPeriodType",
			template.interestPostingPeriodType?.id ?? 4,
		);
		form.setValue(
			"interestCalculationType",
			template.interestCalculationType?.id ?? 1,
		);
		form.setValue(
			"interestCalculationDaysInYearType",
			template.interestCalculationDaysInYearType?.id ?? 365,
		);
		form.setValue("accountingRule", template.accountingRule?.id ?? 1);
		form.setValue(
			"withdrawalFeeForTransfers",
			readUnknownBooleanProperty(template, "withdrawalFeeForTransfers"),
		);
		form.setValue(
			"withHoldTax",
			readUnknownBooleanProperty(template, "withHoldTax"),
		);
		form.setValue(
			"allowOverdraft",
			readUnknownBooleanProperty(template, "allowOverdraft"),
		);
		form.setValue(
			"isDormancyTrackingActive",
			readUnknownBooleanProperty(template, "isDormancyTrackingActive"),
		);
	}, [template, form, isEditMode]);

	useEffect(() => {
		if (!selectedCurrencyCode || !currencyOptions.length) {
			return;
		}

		const selectedCurrency = currencyOptions.find(
			(option) => option.code === selectedCurrencyCode,
		);
		if (!selectedCurrency) {
			return;
		}

		form.setValue("digitsAfterDecimal", selectedCurrency.decimalPlaces ?? 2);
		form.setValue(
			"inMultiplesOf",
			readUnknownNumberProperty(selectedCurrency, "inMultiplesOf") ?? 1,
		);
	}, [selectedCurrencyCode, currencyOptions, form]);

	const requiresCashMappings = accountingRule >= 2;
	const requiresAccrualMappings = accountingRule >= 3;
	const paymentChannelMappings =
		form.watch("paymentChannelToFundSourceMappings") || [];

	const setPaymentChannelMappings = (
		nextMappings: SavingsProductFormData["paymentChannelToFundSourceMappings"],
	) => {
		form.setValue("paymentChannelToFundSourceMappings", nextMappings, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const addPaymentChannelMapping = () => {
		if (paymentTypeOptions.length === 0 || assetAccountOptions.length === 0) {
			return;
		}

		const typedPaymentTypeOptions = paymentTypeOptions.filter(
			(option): option is { id: number; name?: string; description?: string } =>
				typeof option.id === "number",
		);
		if (typedPaymentTypeOptions.length === 0) {
			return;
		}

		const usedPaymentTypeIds = new Set(
			paymentChannelMappings.map((mapping) => mapping.paymentTypeId),
		);
		const nextPaymentTypeId =
			typedPaymentTypeOptions.find(
				(option) => !usedPaymentTypeIds.has(option.id),
			)?.id || typedPaymentTypeOptions[0]?.id;
		const nextFundSourceAccountId =
			form.getValues("savingsReferenceAccountId") || assetAccountOptions[0]?.id;

		if (
			typeof nextPaymentTypeId !== "number" ||
			typeof nextFundSourceAccountId !== "number"
		) {
			return;
		}

		setPaymentChannelMappings([
			...paymentChannelMappings,
			{
				paymentTypeId: nextPaymentTypeId,
				fundSourceAccountId: nextFundSourceAccountId,
			},
		]);
	};

	const updatePaymentChannelMapping = (
		index: number,
		field: "paymentTypeId" | "fundSourceAccountId",
		value: number,
	) => {
		const nextMappings = [...paymentChannelMappings];
		const mapping = nextMappings[index];
		if (!mapping) {
			return;
		}

		nextMappings[index] = {
			...mapping,
			[field]: value,
		};
		setPaymentChannelMappings(nextMappings);
	};

	const removePaymentChannelMapping = (index: number) => {
		setPaymentChannelMappings(
			paymentChannelMappings.filter((_, rowIndex) => rowIndex !== index),
		);
	};

	const handleSubmit = async (values: SavingsProductFormData) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const payload = buildSavingsProductRequest(values);
			await onSubmit(payload);
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: isEditMode ? "updateSavingsProduct" : "createSavingsProduct",
					endpoint: "/api/fineract/savingsproducts",
					method: isEditMode ? "PUT" : "POST",
					tenantId,
				}),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (templateQuery.isLoading) {
		return <SavingsProductFormSkeleton />;
	}

	if (templateQuery.error || !template) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-destructive">
						Failed to load savings product template. Please close and try again.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Identity & Currency</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Name<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input placeholder="Savings Product Name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="shortName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Short Name<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input placeholder="SVP" maxLength={4} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
									<FormLabel>
										Description<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe this savings product"
											rows={3}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="currencyCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Currency<span className="text-destructive">*</span>
									</FormLabel>
									<Select
										value={field.value || undefined}
										onValueChange={field.onChange}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select currency" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{currencyOptions
												.filter((option) => option.code)
												.map((option) => (
													<SelectItem key={option.code} value={option.code!}>
														{option.code} - {option.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<NumberField
							name="digitsAfterDecimal"
							label="Digits After Decimal"
							required={true}
							min="0"
							step="1"
						/>
						<NumberField
							name="inMultiplesOf"
							label="In Multiples Of"
							required={true}
							min="1"
							step="1"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Interest Configuration</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						<NumberField
							name="nominalAnnualInterestRate"
							label="Nominal Annual Interest Rate (%)"
							required={true}
							min="0"
							step="0.01"
						/>
						<SelectField
							name="interestCompoundingPeriodType"
							label="Interest Compounding"
							options={interestCompoundingOptions}
							placeholder="Select compounding"
							required={true}
						/>
						<SelectField
							name="interestPostingPeriodType"
							label="Interest Posting"
							options={interestPostingOptions}
							placeholder="Select posting"
							required={true}
						/>
						<SelectField
							name="interestCalculationType"
							label="Interest Calculation"
							options={interestCalculationOptions}
							placeholder="Select calculation"
							required={true}
						/>
						<SelectField
							name="interestCalculationDaysInYearType"
							label="Days in Year"
							options={interestDaysInYearOptions}
							placeholder="Select days in year"
							required={true}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Accounting</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-4 md:grid-cols-2">
							<SelectField
								name="accountingRule"
								label="Accounting Rule"
								options={accountingRuleOptions}
								placeholder="Select accounting rule"
								required={true}
							/>
						</div>

						{requiresCashMappings ? (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">
									Cash/Accrual accounting requires GL account mappings.
								</p>
								<div className="grid gap-4 md:grid-cols-2">
									<SelectField
										name="savingsReferenceAccountId"
										label="Savings Reference Account"
										options={assetAccountOptions}
										placeholder="Select asset account"
										required={true}
									/>
									<SelectField
										name="savingsControlAccountId"
										label="Savings Control Account"
										options={liabilityAccountOptions}
										placeholder="Select liability account"
										required={true}
									/>
									<SelectField
										name="interestOnSavingsAccountId"
										label="Interest On Savings Account"
										options={expenseAccountOptions}
										placeholder="Select expense account"
										required={true}
									/>
									<SelectField
										name="incomeFromFeeAccountId"
										label="Income From Fee Account"
										options={incomeAccountOptions}
										placeholder="Select income account"
										required={true}
									/>
									<SelectField
										name="incomeFromPenaltyAccountId"
										label="Income From Penalty Account"
										options={incomeAccountOptions}
										placeholder="Select income account"
										required={true}
									/>
									<SelectField
										name="transfersInSuspenseAccountId"
										label="Transfers In Suspense"
										options={liabilityAccountOptions}
										placeholder="Select liability account"
										required={true}
									/>
									<SelectField
										name="overdraftPortfolioControlId"
										label="Overdraft Portfolio Control"
										options={assetAccountOptions}
										placeholder="Select asset account"
										required={true}
									/>
									<SelectField
										name="incomeFromInterestId"
										label="Income From Interest"
										options={incomeAccountOptions}
										placeholder="Select income account"
										required={true}
									/>
									<SelectField
										name="writeOffAccountId"
										label="Write-off Account"
										options={expenseAccountOptions}
										placeholder="Select expense account"
										required={true}
									/>
								</div>
								<div className="space-y-3 rounded-sm border border-border/60 p-3">
									<div className="flex items-center justify-between gap-2">
										<div className="space-y-0.5">
											<p className="text-sm font-medium">
												Payment Channel to Fund Source Mappings
											</p>
											<p className="text-xs text-muted-foreground">
												Map payment types to fund source accounts for this
												savings product.
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={addPaymentChannelMapping}
											disabled={
												paymentTypeOptions.length === 0 ||
												assetAccountOptions.length === 0
											}
										>
											<Plus className="h-3.5 w-3.5 mr-1.5" />
											Add Mapping
										</Button>
									</div>
									{paymentTypeOptions.length === 0 ? (
										<p className="text-xs text-muted-foreground">
											No payment types are available in the template.
										</p>
									) : paymentChannelMappings.length === 0 ? (
										<p className="text-xs text-muted-foreground">
											No payment channel mappings configured.
										</p>
									) : (
										<div className="space-y-3">
											{paymentChannelMappings.map((mapping, index) => (
												<div
													key={`savings-payment-channel-mapping-${mapping.paymentTypeId}-${mapping.fundSourceAccountId}-${index}`}
													className="grid gap-3 rounded-sm border border-border/60 p-3 md:grid-cols-[1fr_1fr_auto]"
												>
													<div className="space-y-2">
														<Label htmlFor={`paymentTypeId-${index}`}>
															Payment Type
														</Label>
														<Select
															value={String(mapping.paymentTypeId)}
															onValueChange={(value) =>
																updatePaymentChannelMapping(
																	index,
																	"paymentTypeId",
																	Number(value),
																)
															}
														>
															<SelectTrigger id={`paymentTypeId-${index}`}>
																<SelectValue placeholder="Select payment type" />
															</SelectTrigger>
															<SelectContent>
																{paymentTypeOptions
																	.filter(
																		(
																			option,
																		): option is {
																			id: number;
																			name?: string;
																			description?: string;
																		} => typeof option.id === "number",
																	)
																	.map((option) => (
																		<SelectItem
																			key={option.id}
																			value={String(option.id)}
																		>
																			{option.name ||
																				option.description ||
																				`Payment Type #${option.id}`}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</div>
													<div className="space-y-2">
														<Label htmlFor={`fundSourceAccountId-${index}`}>
															Fund Source Account
														</Label>
														<Select
															value={String(mapping.fundSourceAccountId)}
															onValueChange={(value) =>
																updatePaymentChannelMapping(
																	index,
																	"fundSourceAccountId",
																	Number(value),
																)
															}
														>
															<SelectTrigger
																id={`fundSourceAccountId-${index}`}
															>
																<SelectValue placeholder="Select account" />
															</SelectTrigger>
															<SelectContent>
																{assetAccountOptions.map((option) => (
																	<SelectItem
																		key={option.id}
																		value={String(option.id)}
																	>
																		{getOptionLabel(option)}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<div className="flex items-end">
														<Button
															type="button"
															size="icon-sm"
															variant="outline"
															onClick={() => removePaymentChannelMapping(index)}
															aria-label={`Remove mapping ${index + 1}`}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
									{form.formState.errors.paymentChannelToFundSourceMappings
										?.message ? (
										<p className="text-sm text-destructive">
											{String(
												form.formState.errors.paymentChannelToFundSourceMappings
													.message,
											)}
										</p>
									) : null}
								</div>
							</div>
						) : null}

						{requiresAccrualMappings ? (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">
									Accrual accounting requires receivable and payable mappings.
								</p>
								<div className="grid gap-4 md:grid-cols-2">
									<SelectField
										name="feesReceivableAccountId"
										label="Fees Receivable Account"
										options={assetAccountOptions}
										placeholder="Select asset account"
										required={true}
									/>
									<SelectField
										name="penaltiesReceivableAccountId"
										label="Penalties Receivable Account"
										options={assetAccountOptions}
										placeholder="Select asset account"
										required={true}
									/>
									<SelectField
										name="interestPayableAccountId"
										label="Interest Payable Account"
										options={liabilityAccountOptions}
										placeholder="Select liability account"
										required={true}
									/>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Additional Settings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<NumberField
								name="lockinPeriodFrequency"
								label="Lock-in Period"
								placeholder="Optional"
								min="0"
								step="1"
							/>
							<SelectField
								name="lockinPeriodFrequencyType"
								label="Lock-in Frequency Type"
								options={lockinFrequencyOptions}
								placeholder="Optional"
							/>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<FormField
								control={form.control}
								name="withdrawalFeeForTransfers"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 rounded-sm border p-3">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={(checked) =>
													field.onChange(Boolean(checked))
												}
											/>
										</FormControl>
										<FormLabel className="font-normal">
											Withdrawal Fee For Transfers
										</FormLabel>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="withHoldTax"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 rounded-sm border p-3">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={(checked) =>
													field.onChange(Boolean(checked))
												}
											/>
										</FormControl>
										<FormLabel className="font-normal">Withhold Tax</FormLabel>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="allowOverdraft"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 rounded-sm border p-3">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={(checked) =>
													field.onChange(Boolean(checked))
												}
											/>
										</FormControl>
										<FormLabel className="font-normal">
											Allow Overdraft
										</FormLabel>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isDormancyTrackingActive"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2 rounded-sm border p-3">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={(checked) =>
													field.onChange(Boolean(checked))
												}
											/>
										</FormControl>
										<FormLabel className="font-normal">
											Dormancy Tracking Active
										</FormLabel>
									</FormItem>
								)}
							/>
						</div>
					</CardContent>
				</Card>

				{chargeOptions.length > 0 ? (
					<Card>
						<CardHeader>
							<CardTitle>Charges</CardTitle>
						</CardHeader>
						<CardContent>
							<FormField
								control={form.control}
								name="charges"
								render={({ field }) => {
									const selectedCharges = field.value || [];
									return (
										<div className="space-y-3">
											{chargeOptions
												.filter((option) => option.id !== undefined)
												.map((option) => {
													const optionId = option.id!;
													const isChecked = selectedCharges.includes(optionId);
													return (
														<div
															key={optionId}
															className="flex items-center gap-2 rounded-sm border p-3"
														>
															<Checkbox
																checked={isChecked}
																onCheckedChange={(checked) => {
																	if (checked) {
																		field.onChange([
																			...selectedCharges,
																			optionId,
																		]);
																		return;
																	}
																	field.onChange(
																		selectedCharges.filter(
																			(id) => id !== optionId,
																		),
																	);
																}}
															/>
															<label className="text-sm">{option.name}</label>
														</div>
													);
												})}
										</div>
									);
								}}
							/>
						</CardContent>
					</Card>
				) : null}

				<SubmitErrorAlert
					error={submitError}
					title={
						isEditMode
							? "Failed to update savings product"
							: "Failed to create savings product"
					}
				/>

				<div className="flex items-center justify-end gap-2">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting
							? isEditMode
								? "Updating..."
								: "Creating..."
							: isEditMode
								? "Update Savings Product"
								: "Create Savings Product"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
