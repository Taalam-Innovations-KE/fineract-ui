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
import type {
	GetRolesResponse,
	GetUsersResponse,
	OfficeData,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitErrorsByField,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import { FINERACT_PASSWORD_MESSAGE } from "@/lib/schemas/password";
import {
	type CreateTeamMemberFormData,
	createTeamMemberSchema,
	type TeamMemberRequestPayload,
	teamMemberFormToRequest,
} from "@/lib/schemas/team-member";

interface TeamMemberFormProps {
	offices: OfficeData[];
	roles: GetRolesResponse[];
	initialData?: GetUsersResponse;
	onSubmit: (data: TeamMemberRequestPayload) => Promise<void>;
	onCancel: () => void;
}

const SERVER_FIELD_MAP: Record<string, keyof CreateTeamMemberFormData> = {
	username: "email",
	email: "email",
	firstname: "firstname",
	lastname: "lastname",
	officeId: "officeId",
	roles: "roles",
	password: "password",
	repeatPassword: "repeatPassword",
	joiningDate: "joiningDate",
};

export function TeamMemberForm({
	offices,
	roles,
	initialData,
	onSubmit,
	onCancel,
}: TeamMemberFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditing = Boolean(initialData);

	const initialRoleIds = new Set(
		initialData?.selectedRoles?.map((r) => r.id!).filter(Boolean) ?? [],
	);
	const [selectedRoles, setSelectedRoles] =
		useState<Set<number>>(initialRoleIds);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		setValue,
		setError,
	} = useForm<CreateTeamMemberFormData>({
		resolver: zodResolver(createTeamMemberSchema),
		defaultValues: initialData
			? {
					firstname: initialData.firstname || "",
					lastname: initialData.lastname || "",
					email: initialData.email || "",
					officeId: initialData.officeId,
					roles: Array.from(initialRoleIds),
					isLoanOfficer: false,
					isActive: true,
					// Password fields are empty in edit mode - user can optionally set new password
					password: "",
					repeatPassword: "",
				}
			: {
					roles: [],
					isLoanOfficer: false,
					isActive: true,
				},
	});

	const toggleRole = (roleId: number) => {
		const newSet = new Set(selectedRoles);
		if (newSet.has(roleId)) {
			newSet.delete(roleId);
		} else {
			newSet.add(roleId);
		}
		setSelectedRoles(newSet);
		setValue("roles", Array.from(newSet));
	};

	const applyServerErrors = (
		error: SubmitActionError,
		rollbackSuggestion?: string,
	) => {
		let fieldErrorApplied = false;
		const errorsByField = getSubmitErrorsByField(error);

		Object.entries(errorsByField).forEach(([field, messages]) => {
			if (messages.length === 0) {
				return;
			}

			const mappedField = SERVER_FIELD_MAP[field];
			if (!mappedField) {
				if (field === "general") {
					setSubmitError({
						...error,
						message: messages[0],
					});
				}
				return;
			}

			setError(mappedField, { type: "server", message: messages[0] });
			fieldErrorApplied = true;
		});

		const fallbackMessage = [error.message, rollbackSuggestion]
			.filter(Boolean)
			.join(" ");
		if (rollbackSuggestion) {
			setSubmitError({
				...error,
				message: fallbackMessage,
			});
			return;
		}
		if (!fieldErrorApplied && fallbackMessage) {
			setSubmitError({
				...error,
				message: fallbackMessage,
			});
		}
	};

	const onFormSubmit = async (data: CreateTeamMemberFormData) => {
		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const requestData = teamMemberFormToRequest(data);
			await onSubmit(requestData);
		} catch (error) {
			const rollbackSuggestion =
				typeof (error as { rollbackSuggestion?: unknown })
					?.rollbackSuggestion === "string"
					? (error as { rollbackSuggestion?: string }).rollbackSuggestion
					: undefined;

			const trackedError = toSubmitActionError(error, {
				action: isEditing ? "updateTeamMember" : "createTeamMember",
				endpoint:
					isEditing && initialData?.id
						? `/api/fineract/users/${initialData.id}`
						: "/api/fineract/onboarding",
				method: isEditing ? "PUT" : "POST",
			});

			applyServerErrors(trackedError, rollbackSuggestion);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			<SubmitErrorAlert
				error={submitError}
				title={isEditing ? "Update failed" : "Creation failed"}
			/>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Staff details
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
							<p className="text-sm text-destructive">
								{errors.officeId.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="joiningDate">Joining Date</Label>
						<Input
							id="joiningDate"
							type="date"
							{...register("joiningDate", { valueAsDate: true })}
						/>
						{errors.joiningDate && (
							<p className="text-sm text-destructive">
								{errors.joiningDate.message}
							</p>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="mobileNo">Mobile Number</Label>
						<Input
							id="mobileNo"
							{...register("mobileNo")}
							placeholder="Enter mobile number"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="externalId">External ID</Label>
						<Input
							id="externalId"
							{...register("externalId")}
							placeholder="Enter external ID"
						/>
					</div>
				</div>

				<div className="flex flex-wrap gap-4">
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
			</div>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Account access
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">
						Work Email <span className="text-destructive">*</span>
					</Label>
					<Input
						id="email"
						type="email"
						{...register("email")}
						placeholder="user@example.com"
					/>
					<p className="text-xs text-muted-foreground">
						Username will match this email for Keycloak sign-in.
					</p>
					{errors.email && (
						<p className="text-sm text-destructive">{errors.email.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label>
						Roles <span className="text-destructive">*</span>
					</Label>
					<div className="border rounded-sm p-3 space-y-2 max-h-48 overflow-y-auto">
						{roles.map((role) => (
							<div key={role.id} className="flex items-center gap-2">
								<Checkbox
									id={`role-${role.id}`}
									checked={selectedRoles.has(role.id!)}
									onCheckedChange={() => toggleRole(role.id!)}
								/>
								<Label
									htmlFor={`role-${role.id}`}
									className="cursor-pointer flex-1"
								>
									<div className="font-medium">{role.name}</div>
									{role.description && (
										<div className="text-xs text-muted-foreground">
											{role.description}
										</div>
									)}
								</Label>
							</div>
						))}
					</div>
					{errors.roles && (
						<p className="text-sm text-destructive">{errors.roles.message}</p>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="password">
							Password <span className="text-destructive">*</span>
						</Label>
						<Input
							id="password"
							type="password"
							{...register("password")}
							placeholder="Enter password"
						/>
						<p className="text-xs text-muted-foreground">
							{FINERACT_PASSWORD_MESSAGE}
						</p>
						{errors.password && (
							<p className="text-sm text-destructive">
								{errors.password.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="repeatPassword">
							Confirm Password <span className="text-destructive">*</span>
						</Label>
						<Input
							id="repeatPassword"
							type="password"
							{...register("repeatPassword")}
							placeholder="Confirm password"
						/>
						{errors.repeatPassword && (
							<p className="text-sm text-destructive">
								{errors.repeatPassword.message}
							</p>
						)}
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="sendPasswordToEmail"
							render={({ field }) => (
								<Checkbox
									id="sendPasswordToEmail"
									checked={field.value ?? false}
									onCheckedChange={(value) => field.onChange(Boolean(value))}
								/>
							)}
						/>
						<Label htmlFor="sendPasswordToEmail" className="cursor-pointer">
							Send password to email
						</Label>
					</div>

					<div className="flex items-center gap-2">
						<Controller
							control={control}
							name="passwordNeverExpires"
							render={({ field }) => (
								<Checkbox
									id="passwordNeverExpires"
									checked={field.value ?? false}
									onCheckedChange={(value) => field.onChange(Boolean(value))}
								/>
							)}
						/>
						<Label htmlFor="passwordNeverExpires" className="cursor-pointer">
							Password never expires
						</Label>
					</div>
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
							? "Update Team Member"
							: "Create Team Member"}
				</Button>
			</div>
		</form>
	);
}
