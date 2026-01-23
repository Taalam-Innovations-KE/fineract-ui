"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import type {
	GetAccountNumberFormatsIdResponse,
	GetAccountNumberFormatsResponseTemplate,
	PostAccountNumberFormatsRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	type CreateAccountNumberFormatFormData,
	createAccountNumberFormatSchema,
} from "@/lib/schemas/account-number-format";

interface AccountNumberFormatFormProps {
	templateData: GetAccountNumberFormatsResponseTemplate;
	initialData?: GetAccountNumberFormatsIdResponse;
	onSubmit: (data: PostAccountNumberFormatsRequest) => Promise<void>;
	onCancel: () => void;
}

export function AccountNumberFormatForm({
	templateData,
	initialData,
	onSubmit,
	onCancel,
}: AccountNumberFormatFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
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
				}
			: undefined,
	});

	const watchedAccountType = watch("accountType");

	// Update selected account type when form changes
	useEffect(() => {
		setSelectedAccountType(watchedAccountType);
		// Reset prefix type when account type changes
		if (watchedAccountType !== initialData?.accountType?.id) {
			setValue("prefixType", 0);
		}
	}, [watchedAccountType, setValue, initialData?.accountType?.id]);

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
		try {
			const requestData: PostAccountNumberFormatsRequest = {
				accountType: data.accountType,
				prefixType: data.prefixType,
			};
			await onSubmit(requestData);
		} finally {
			setIsSubmitting(false);
		}
	};

	const prefixOptions = getPrefixOptions();

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="accountType">
					Account Type <span className="text-destructive">*</span>
				</Label>
				<Controller
					control={control}
					name="accountType"
					render={({ field }) => (
						<Select
							value={field.value ? String(field.value) : undefined}
							onValueChange={(value) => field.onChange(Number(value))}
						>
							<SelectTrigger id="accountType">
								<SelectValue placeholder="Select account type" />
							</SelectTrigger>
							<SelectContent>
								{templateData.accountTypeOptions?.map((option) => (
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
				<Label htmlFor="prefixType">
					Prefix Type <span className="text-destructive">*</span>
				</Label>
				<Controller
					control={control}
					name="prefixType"
					render={({ field }) => (
						<Select
							value={field.value ? String(field.value) : undefined}
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

			<div className="flex justify-end gap-3 pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? isEditing
							? "Updating..."
							: "Creating..."
						: isEditing
							? "Update Format"
							: "Create Format"}
				</Button>
			</div>
		</form>
	);
}
