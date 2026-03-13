"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import type { OfficeData } from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitErrorsByField,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import {
	createStaffSchema,
	getStaffIsActive,
	type StaffFormRecord,
	type StaffFormValues,
	type StaffRequestPayload,
	staffFormToRequest,
	staffRecordToFormValues,
} from "@/lib/schemas/staff";

interface StaffFormProps {
	offices: OfficeData[];
	initialData?: StaffFormRecord;
	onSubmit: (data: StaffRequestPayload) => Promise<void>;
	onCancel: () => void;
}

const SERVER_FIELD_MAP: Record<string, keyof StaffFormValues> = {
	officeId: "officeId",
	firstname: "firstname",
	lastname: "lastname",
	joiningDate: "joiningDate",
	mobileNo: "mobileNo",
	externalId: "externalId",
	isLoanOfficer: "isLoanOfficer",
	isActive: "isActive",
	forceStatus: "forceStatus",
};

export function StaffForm({
	offices,
	initialData,
	onSubmit,
	onCancel,
}: StaffFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const mode = initialData ? "edit" : "create";
	const allowedOfficeIds = offices
		.map((office) => office.id)
		.filter((officeId): officeId is number => typeof officeId === "number");

	const {
		register,
		handleSubmit,
		control,
		setError,
		watch,
		formState: { errors },
	} = useForm<StaffFormValues>({
		resolver: zodResolver(
			createStaffSchema({
				mode,
				allowedOfficeIds,
			}),
		),
		defaultValues: initialData
			? staffRecordToFormValues(initialData)
			: {
					firstname: "",
					lastname: "",
					mobileNo: "",
					externalId: "",
					isLoanOfficer: false,
					isActive: true,
					forceStatus: false,
				},
	});

	const isActive = watch("isActive");

	const applyServerErrors = (error: SubmitActionError) => {
		let hasFieldError = false;
		const errorsByField = getSubmitErrorsByField(error);

		for (const [field, messages] of Object.entries(errorsByField)) {
			if (messages.length === 0) {
				continue;
			}

			const mappedField = SERVER_FIELD_MAP[field];
			if (!mappedField) {
				continue;
			}

			setError(mappedField, { type: "server", message: messages[0] });
			hasFieldError = true;
		}

		if (!hasFieldError) {
			setSubmitError(error);
		}
	};

	const onFormSubmit = async (data: StaffFormValues) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			await onSubmit(staffFormToRequest(data));
		} catch (error) {
			const trackedError = toSubmitActionError(error, {
				action: mode === "edit" ? "updateStaff" : "createStaff",
				endpoint:
					mode === "edit" && initialData?.id
						? `/api/fineract/staff/${initialData.id}`
						: "/api/fineract/staff",
				method: mode === "edit" ? "PUT" : "POST",
			});
			applyServerErrors(trackedError);
			setSubmitError(trackedError);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<SubmitErrorAlert
				error={submitError}
				title={
					mode === "edit" ? "Failed to update staff" : "Failed to create staff"
				}
			/>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Employment profile
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="officeId">
							Office <span className="text-destructive">*</span>
						</Label>
						<Controller
							control={control}
							name="officeId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : undefined}
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
							<p className="text-sm text-destructive">
								{errors.officeId.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="joiningDate">
							Joining Date <span className="text-destructive">*</span>
						</Label>
						<Input
							id="joiningDate"
							type="date"
							{...register("joiningDate", { valueAsDate: true })}
						/>
						<p className="text-xs text-muted-foreground">
							Required on creation. Keep this populated when updating staff.
						</p>
						{errors.joiningDate && (
							<p className="text-sm text-destructive">
								{errors.joiningDate.message}
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Contact and status
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="mobileNo">Mobile Number</Label>
						<Input
							id="mobileNo"
							{...register("mobileNo")}
							placeholder="Enter mobile number"
						/>
						{errors.mobileNo && (
							<p className="text-sm text-destructive">
								{errors.mobileNo.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="externalId">External ID</Label>
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
				</div>

				<div className="space-y-3 rounded-sm border border-border/60 p-4">
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
							Assign as loan officer
						</Label>
					</div>
					{errors.isLoanOfficer && (
						<p className="text-sm text-destructive">
							{errors.isLoanOfficer.message}
						</p>
					)}

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
							Staff member is active
						</Label>
					</div>
					{errors.isActive && (
						<p className="text-sm text-destructive">
							{errors.isActive.message}
						</p>
					)}

					{!isActive && (
						<div className="space-y-2 rounded-sm border border-warning/30 bg-warning/5 p-3">
							<div className="flex items-center gap-2">
								<Controller
									control={control}
									name="forceStatus"
									render={({ field }) => (
										<Checkbox
											id="forceStatus"
											checked={field.value ?? false}
											onCheckedChange={(value) =>
												field.onChange(Boolean(value))
											}
										/>
									)}
								/>
								<Label htmlFor="forceStatus" className="cursor-pointer">
									Force inactive status
								</Label>
							</div>
							<p className="text-xs text-muted-foreground">
								Use this only if the backend blocks inactivation because the
								staff member is still assigned to live portfolio records.
							</p>
							{errors.forceStatus && (
								<p className="text-sm text-destructive">
									{errors.forceStatus.message}
								</p>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Save className="mr-2 h-4 w-4" />
					{isSubmitting
						? mode === "edit"
							? "Saving..."
							: "Creating..."
						: mode === "edit"
							? getStaffIsActive(initialData)
								? "Update Staff"
								: "Save Staff"
							: "Create Staff"}
				</Button>
			</div>
		</form>
	);
}
