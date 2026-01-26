"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
	Staff,
	StaffRequest,
} from "@/lib/fineract/generated/types.gen";
import {
	type CreateStaffFormData,
	createStaffSchema,
	type StaffRequestPayload,
	staffFormToRequest,
} from "@/lib/schemas/staff";

interface StaffFormProps {
	offices: OfficeData[];
	initialData?: Staff;
	onSubmit: (data: StaffRequestPayload) => Promise<void>;
	onCancel: () => void;
}

export function StaffForm({
	offices,
	initialData,
	onSubmit,
	onCancel,
}: StaffFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditing = Boolean(initialData);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateStaffFormData>({
		resolver: zodResolver(createStaffSchema),
		defaultValues: initialData
			? {
					firstname: initialData.firstname || "",
					lastname: initialData.lastname || "",
					officeId: initialData.office?.id,
					mobileNo: initialData.mobileNo || "",
					externalId: initialData.externalId || "",
					isLoanOfficer: initialData.loanOfficer ?? false,
					isActive: initialData.active ?? true,
					joiningDate: initialData.joiningDate
						? new Date(initialData.joiningDate)
						: undefined,
				}
			: {
					isLoanOfficer: false,
					isActive: true,
				},
	});

	const onFormSubmit = async (data: CreateStaffFormData) => {
		setIsSubmitting(true);
		try {
			const requestData = staffFormToRequest(data);
			await onSubmit(requestData);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="firstname">
						First Name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="firstname"
						{...register("firstname")}
						placeholder="Enter first name"
					/>
					{errors.firstname && (
						<p className="text-sm text-destructive">
							{errors.firstname.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="lastname">
						Last Name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="lastname"
						{...register("lastname")}
						placeholder="Enter last name"
					/>
					{errors.lastname && (
						<p className="text-sm text-destructive">
							{errors.lastname.message}
						</p>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="officeId">
					Office <span className="text-destructive">*</span>
				</Label>
				<Controller
					control={control}
					name="officeId"
					render={({ field }) => (
						<Select
							value={
								field.value !== undefined && field.value !== null
									? String(field.value)
									: undefined
							}
							onValueChange={(value) => field.onChange(Number(value))}
						>
							<SelectTrigger id="officeId">
								<SelectValue placeholder="Select office" />
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
				{errors.officeId && (
					<p className="text-sm text-destructive">{errors.officeId.message}</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="mobileNo">Mobile Number</Label>
					<Input
						id="mobileNo"
						{...register("mobileNo")}
						placeholder="Enter mobile number"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="joiningDate">Joining Date</Label>
					<Input
						id="joiningDate"
						type="date"
						{...register("joiningDate", { valueAsDate: true })}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="externalId">External ID</Label>
				<Input
					id="externalId"
					{...register("externalId")}
					placeholder="Enter external ID"
				/>
			</div>

			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="isLoanOfficer"
						render={({ field }) => (
							<Checkbox
								id="isLoanOfficer"
								checked={field.value ?? false}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
							/>
						)}
					/>
					<Label htmlFor="isLoanOfficer" className="cursor-pointer">
						Is Loan Officer
					</Label>
				</div>

				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="isActive"
						render={({ field }) => (
							<Checkbox
								id="isActive"
								checked={field.value ?? false}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
							/>
						)}
					/>
					<Label htmlFor="isActive" className="cursor-pointer">
						Is Active
					</Label>
				</div>
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
					<Save className="w-4 h-4 mr-2" />
					{isSubmitting
						? isEditing
							? "Updating..."
							: "Creating..."
						: isEditing
							? "Update Staff"
							: "Create Staff"}
				</Button>
			</div>
		</form>
	);
}
