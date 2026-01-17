"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
	OfficeData,
	PostOfficesRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	type CreateOfficeFormData,
	createOfficeSchema,
	officeFormToRequest,
} from "@/lib/schemas/office";

interface OfficeFormProps {
	offices: OfficeData[];
	initialData?: OfficeData;
	onSubmit: (data: PostOfficesRequest) => Promise<void>;
	onCancel: () => void;
}

export function OfficeForm({
	offices,
	initialData,
	onSubmit,
	onCancel,
}: OfficeFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditing = Boolean(initialData);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateOfficeFormData>({
		resolver: zodResolver(createOfficeSchema),
		defaultValues: initialData
			? {
					name: initialData.name || "",
					parentId: initialData.parentId,
					externalId: initialData.externalId || "",
					openingDate: initialData.openingDate
						? new Date(initialData.openingDate)
						: new Date(),
				}
			: {
					openingDate: new Date(),
				},
	});

	const onFormSubmit = async (data: CreateOfficeFormData) => {
		setIsSubmitting(true);
		try {
			const requestData = officeFormToRequest(data);
			await onSubmit(requestData);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">
					Office Name <span className="text-destructive">*</span>
				</Label>
				<Input
					id="name"
					{...register("name")}
					placeholder="Enter office name"
				/>
				{errors.name && (
					<p className="text-sm text-destructive">{errors.name.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="parentId">
					Parent Office <span className="text-destructive">*</span>
				</Label>
				<Controller
					control={control}
					name="parentId"
					render={({ field }) => (
						<Select
							value={
								field.value !== undefined && field.value !== null
									? String(field.value)
									: undefined
							}
							onValueChange={(value) => field.onChange(Number(value))}
						>
							<SelectTrigger id="parentId">
								<SelectValue placeholder="Select parent office" />
							</SelectTrigger>
							<SelectContent>
								{offices.map((office) => (
									<SelectItem key={office.id} value={String(office.id)}>
										{office.nameDecorated || office.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				{errors.parentId && (
					<p className="text-sm text-destructive">{errors.parentId.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="openingDate">
					Opening Date <span className="text-destructive">*</span>
				</Label>
				<Input
					id="openingDate"
					type="date"
					{...register("openingDate", { valueAsDate: true })}
				/>
				{errors.openingDate && (
					<p className="text-sm text-destructive">
						{errors.openingDate.message}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="externalId">External ID (Optional)</Label>
				<Input
					id="externalId"
					{...register("externalId")}
					placeholder="Enter external ID"
				/>
				{errors.externalId && (
					<p className="text-sm text-destructive">
						{errors.externalId.message}
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
							? "Update Office"
							: "Create Office"}
				</Button>
			</div>
		</form>
	);
}
