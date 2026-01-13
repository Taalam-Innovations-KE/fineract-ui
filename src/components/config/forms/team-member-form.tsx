"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FineractError } from "@/lib/fineract/error-mapping";
import type {
	GetRolesResponse,
	OfficeData,
} from "@/lib/fineract/generated/types.gen";
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
	onSubmit,
	onCancel,
}: TeamMemberFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
	const [submitError, setSubmitError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		setError,
	} = useForm<CreateTeamMemberFormData>({
		resolver: zodResolver(createTeamMemberSchema),
		defaultValues: {
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
		error: FineractError & { rollbackSuggestion?: string },
	) => {
		let fieldErrorApplied = false;

		if (error.details) {
			Object.entries(error.details).forEach(([field, messages]) => {
				if (messages.length === 0) {
					return;
				}

				const mappedField = SERVER_FIELD_MAP[field];
				if (!mappedField) {
					if (field === "general") {
						setSubmitError(messages[0]);
					}
					return;
				}

				setError(mappedField, { type: "server", message: messages[0] });
				fieldErrorApplied = true;
			});
		}

		const fallbackMessage = [error.message, error.rollbackSuggestion]
			.filter(Boolean)
			.join(" ");
		if (error.rollbackSuggestion) {
			setSubmitError(fallbackMessage);
			return;
		}
		if (!fieldErrorApplied && fallbackMessage) {
			setSubmitError(fallbackMessage);
		}
	};

	const onFormSubmit = async (data: CreateTeamMemberFormData) => {
		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const requestData = teamMemberFormToRequest(data);
			await onSubmit(requestData);
		} catch (error) {
			const fineractError = error as FineractError & {
				rollbackSuggestion?: string;
			};
			if (
				fineractError &&
				typeof fineractError === "object" &&
				"message" in fineractError
			) {
				applyServerErrors(fineractError);
			} else if (error instanceof Error) {
				setSubmitError(error.message);
			} else {
				setSubmitError("Failed to create team member. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
			{submitError && (
				<Alert variant="destructive">
					<AlertTitle>Creation failed</AlertTitle>
					<AlertDescription>{submitError}</AlertDescription>
				</Alert>
			)}

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
						<Select
							id="officeId"
							{...register("officeId", { valueAsNumber: true })}
						>
							<option value="">Select office</option>
							{offices.map((office) => (
								<option key={office.id} value={office.id}>
									{office.nameDecorated || office.name}
								</option>
							))}
						</Select>
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
						<Checkbox id="isLoanOfficer" {...register("isLoanOfficer")} />
						<Label htmlFor="isLoanOfficer" className="cursor-pointer">
							Is Loan Officer
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox id="isActive" {...register("isActive")} />
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
					<div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
						{roles.map((role) => (
							<div key={role.id} className="flex items-center gap-2">
								<Checkbox
									id={`role-${role.id}`}
									checked={selectedRoles.has(role.id!)}
									onChange={() => toggleRole(role.id!)}
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
						<Checkbox
							id="sendPasswordToEmail"
							{...register("sendPasswordToEmail")}
						/>
						<Label htmlFor="sendPasswordToEmail" className="cursor-pointer">
							Send password to email
						</Label>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="passwordNeverExpires"
							{...register("passwordNeverExpires")}
						/>
						<Label htmlFor="passwordNeverExpires" className="cursor-pointer">
							Password never expires
						</Label>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="isSelfServiceUser"
							{...register("isSelfServiceUser")}
						/>
						<Label htmlFor="isSelfServiceUser" className="cursor-pointer">
							Self-service user
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
					{isSubmitting ? "Creating..." : "Create Team Member"}
				</Button>
			</div>
		</form>
	);
}
