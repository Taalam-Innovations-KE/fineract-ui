"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleHelp, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type AccountNumberFormatMutationRequest,
	type AccountNumberFormatRecord,
	PREFIX_SHORT_NAME_TYPE_ID as PREFIX_SHORT_NAME_ID,
} from "@/lib/fineract/account-number-formats";
import type {
	EnumOptionData,
	GetAccountNumberFormatsResponseTemplate,
} from "@/lib/fineract/generated/types.gen";
import {
	type CreateAccountNumberFormatFormData,
	createAccountNumberFormatSchema,
} from "@/lib/schemas/account-number-format";

interface AccountNumberFormatFormProps {
	templateData: GetAccountNumberFormatsResponseTemplate;
	initialData?: AccountNumberFormatRecord;
	onSubmit: (data: AccountNumberFormatMutationRequest) => Promise<void>;
	onDelete?: () => Promise<void>;
	onCancel: () => void;
}

const ACCOUNT_TYPE_DESCRIPTIONS: Record<string, string> = {
	"accountType.client":
		"Client accounts identify customer profiles and are used as the base reference for client-level records.",
	"accountType.loan":
		"Loan accounts track borrowing products and all loan lifecycle transactions.",
	"accountType.savings":
		"Savings accounts track deposit products, balances, and savings transactions.",
	"accountType.center":
		"Center accounts are used for center/grouping structures in group-based lending setups.",
	"accountType.group":
		"Group accounts identify borrowing or operational groups under an office structure.",
	"accountType.shares":
		"Share accounts track share products and shareholder ownership transactions.",
};

const PREFIX_TYPE_DESCRIPTIONS: Record<string, string> = {
	"accountNumberPrefixType.prefixShortName":
		"Uses a configured short code prefix to keep account numbers compact and recognizable.",
	"accountNumberPrefixType.officeName":
		"Prefixes account numbers based on the office context where the account is created.",
	"accountNumberPrefixType.clientType":
		"Prefixes account numbers using the client's type classification.",
	"accountNumberPrefixType.loanProductShortName":
		"Prefixes account numbers using the selected loan product short name.",
	"accountNumberPrefixType.savingsProductShortName":
		"Prefixes account numbers using the selected savings product short name.",
};

function getOptionDescription(
	option: EnumOptionData | undefined,
	descriptionMap: Record<string, string>,
	fallback: string,
) {
	if (!option?.code) {
		return fallback;
	}
	return descriptionMap[option.code] || fallback;
}

export function AccountNumberFormatForm({
	templateData,
	initialData,
	onSubmit,
	onDelete,
	onCancel,
}: AccountNumberFormatFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [selectedAccountType, setSelectedAccountType] = useState<
		number | undefined
	>(initialData?.accountType?.id);
	const isEditing = Boolean(initialData);

	const {
		handleSubmit,
		control,
		formState: { errors },
		watch,
		setValue,
	} = useForm<CreateAccountNumberFormatFormData>({
		resolver: zodResolver(createAccountNumberFormatSchema),
		defaultValues: initialData
			? {
					accountType: initialData.accountType?.id || 0,
					prefixType: initialData.prefixType?.id || 0,
					prefixCharacter: initialData.prefixCharacter || "",
				}
			: undefined,
	});

	const watchedAccountType = watch("accountType");
	const watchedPrefixType = watch("prefixType");

	// Update selected account type when form changes
	useEffect(() => {
		setSelectedAccountType(watchedAccountType);
		// Reset prefix type when account type changes
		if (watchedAccountType !== initialData?.accountType?.id) {
			setValue("prefixType", 0);
			setValue("prefixCharacter", "");
		}
	}, [watchedAccountType, setValue, initialData?.accountType?.id]);

	useEffect(() => {
		if (watchedPrefixType !== PREFIX_SHORT_NAME_ID) {
			setValue("prefixCharacter", "");
		}
	}, [watchedPrefixType, setValue]);

	// Get available prefix options for selected account type
	const getPrefixOptions = () => {
		if (!selectedAccountType || !templateData.prefixTypeOptions) {
			return [];
		}

		const accountTypeKey = `accountType.${templateData.accountTypeOptions
			?.find((option) => option.id === selectedAccountType)
			?.code?.split(".")[1]
			?.toLowerCase()}`;

		return templateData.prefixTypeOptions[accountTypeKey] || [];
	};

	const onFormSubmit = async (data: CreateAccountNumberFormatFormData) => {
		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const requestData: AccountNumberFormatMutationRequest = {
				prefixType: data.prefixType,
			};

			if (!isEditing) {
				requestData.accountType = data.accountType;
			}
			if (data.prefixType === PREFIX_SHORT_NAME_ID) {
				requestData.prefixCharacter = data.prefixCharacter?.trim();
			}

			await onSubmit(requestData);
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: "Failed to save account number format",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!onDelete) return;
		const confirmed = window.confirm(
			"Delete this account number format? This action cannot be undone.",
		);
		if (!confirmed) return;

		setIsSubmitting(true);
		setSubmitError(null);
		try {
			await onDelete();
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: "Failed to delete account number format",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const prefixOptions = getPrefixOptions();
	const accountTypeOptions = templateData.accountTypeOptions || [];
	const requiresPrefixCharacter = watchedPrefixType === PREFIX_SHORT_NAME_ID;

	return (
		<TooltipProvider>
			<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
				{submitError && (
					<Alert variant="destructive">
						<AlertTitle>Unable to complete request</AlertTitle>
						<AlertDescription>{submitError}</AlertDescription>
					</Alert>
				)}
				<div className="space-y-2">
					<div className="flex items-center gap-1.5">
						<Label htmlFor="accountType">
							Account Type <span className="text-destructive">*</span>
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Account type help"
								>
									<CircleHelp className="h-4 w-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent className="max-w-sm space-y-1">
								<p className="text-xs font-semibold">Account Type Guide</p>
								{accountTypeOptions.map((option) => (
									<p key={option.id} className="text-xs">
										<span className="font-medium">{option.value}:</span>{" "}
										{getOptionDescription(
											option,
											ACCOUNT_TYPE_DESCRIPTIONS,
											"A Fineract account category used to separate numbering rules.",
										)}
									</p>
								))}
							</TooltipContent>
						</Tooltip>
					</div>
					<Controller
						control={control}
						name="accountType"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ""}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={isEditing}
							>
								<SelectTrigger id="accountType">
									<SelectValue placeholder="Select account type" />
								</SelectTrigger>
								<SelectContent>
									{accountTypeOptions.map((option) => (
										<SelectItem key={option.id} value={String(option.id)}>
											{option.value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.accountType && (
						<p className="text-sm text-destructive">
							{errors.accountType.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<div className="flex items-center gap-1.5">
						<Label htmlFor="prefixType">
							Prefix Type <span className="text-destructive">*</span>
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground transition-colors"
									aria-label="Prefix type help"
								>
									<CircleHelp className="h-4 w-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent className="max-w-sm space-y-1">
								<p className="text-xs font-semibold">Prefix Type Guide</p>
								{!selectedAccountType && (
									<p className="text-xs">
										Select an account type first to see available prefix styles.
									</p>
								)}
								{selectedAccountType && prefixOptions.length === 0 && (
									<p className="text-xs">
										No prefix styles are configured for this account type.
									</p>
								)}
								{prefixOptions.map((option) => (
									<p key={option.id} className="text-xs">
										<span className="font-medium">{option.value}:</span>{" "}
										{getOptionDescription(
											option,
											PREFIX_TYPE_DESCRIPTIONS,
											"Controls how the prefix part of generated account numbers is derived.",
										)}
									</p>
								))}
							</TooltipContent>
						</Tooltip>
					</div>
					<Controller
						control={control}
						name="prefixType"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ""}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={!selectedAccountType || prefixOptions.length === 0}
							>
								<SelectTrigger id="prefixType">
									<SelectValue
										placeholder={
											!selectedAccountType
												? "Select account type first"
												: prefixOptions.length === 0
													? "No prefix options available"
													: "Select prefix type"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{prefixOptions.map((option) => (
										<SelectItem key={option.id} value={String(option.id)}>
											{option.value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.prefixType && (
						<p className="text-sm text-destructive">
							{errors.prefixType.message}
						</p>
					)}
				</div>
				{requiresPrefixCharacter && (
					<div className="space-y-2">
						<Label htmlFor="prefixCharacter">
							Prefix Characters <span className="text-destructive">*</span>
						</Label>
						<Controller
							control={control}
							name="prefixCharacter"
							render={({ field }) => (
								<Input
									{...field}
									id="prefixCharacter"
									value={field.value || ""}
									placeholder="Enter prefix characters (e.g. LN)"
									maxLength={20}
								/>
							)}
						/>
						<p className="text-xs text-muted-foreground">
							Required when using PREFIX_SHORT_NAME.
						</p>
						{errors.prefixCharacter && (
							<p className="text-sm text-destructive">
								{errors.prefixCharacter.message}
							</p>
						)}
					</div>
				)}

				<div className="flex justify-between gap-3 pt-4">
					<div>
						{isEditing && onDelete && (
							<Button
								type="button"
								variant="destructive"
								onClick={handleDelete}
								disabled={isSubmitting}
							>
								Delete Format
							</Button>
						)}
					</div>
					<div className="flex gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isSubmitting}
						>
							<X className="w-4 h-4 mr-2" />
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							<Save className="w-4 h-4 mr-2" />
							{isSubmitting
								? isEditing
									? "Updating..."
									: "Creating..."
								: isEditing
									? "Update Format"
									: "Create Format"}
						</Button>
					</div>
				</div>
			</form>
		</TooltipProvider>
	);
}
