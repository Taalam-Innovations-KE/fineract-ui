"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
	onSubmit: (data: PostOfficesRequest) => Promise<void>;
	onCancel: () => void;
}

export function OfficeForm({ offices, onSubmit, onCancel }: OfficeFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<CreateOfficeFormData>({
		resolver: zodResolver(createOfficeSchema),
		defaultValues: {
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
				<Select
					id="parentId"
					{...register("parentId", { valueAsNumber: true })}
				>
					<option value="">Select parent office</option>
					{offices.map((office) => (
						<option key={office.id} value={office.id}>
							{office.nameDecorated || office.name}
						</option>
					))}
				</Select>
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
					{isSubmitting ? "Creating..." : "Create Office"}
				</Button>
			</div>
		</form>
	);
}
