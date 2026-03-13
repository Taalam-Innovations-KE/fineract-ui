"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { Badge } from "@/components/ui/badge";
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
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	OfficeData,
	PostUsersRequest,
	PutUsersUserIdRequest,
	Staff,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import {
	getSubmitErrorsByField,
	toSubmitActionError,
} from "@/lib/fineract/submit-error";
import { normalizeFailedResponse } from "@/lib/fineract/ui-api-error";
import { FINERACT_PASSWORD_MESSAGE } from "@/lib/schemas/password";
import {
	createUserSchema,
	getUserLinkedStaffId,
	type UserFormMode,
	type UserFormRecord,
	type UserFormValues,
	type UserLinkedStaffRecord,
	type UserRoleOption,
	userFormToCreateRequest,
	userFormToUpdateRequest,
	userRecordToFormValues,
} from "@/lib/schemas/user";
import { useTenantStore } from "@/store/tenant";

interface UserFormProps {
	mode: UserFormMode;
	offices: OfficeData[];
	roles: UserRoleOption[];
	selfServiceRoleIds?: number[];
	initialData?: UserFormRecord;
	onSubmit: (data: PostUsersRequest | PutUsersUserIdRequest) => Promise<void>;
	onCancel: () => void;
}

const SERVER_FIELD_MAP: Record<string, keyof UserFormValues> = {
	username: "username",
	email: "email",
	firstname: "firstname",
	lastname: "lastname",
	officeId: "officeId",
	staffId: "staffId",
	roles: "roles",
	password: "password",
	repeatPassword: "repeatPassword",
	sendPasswordToEmail: "sendPasswordToEmail",
};

async function fetchActiveOfficeStaff(tenantId: string, officeId: number) {
	const response = await fetch(
		`${BFF_ROUTES.staff}?officeId=${officeId}&status=active`,
		{
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	if (!response.ok) {
		throw await normalizeFailedResponse(response);
	}

	return (await response.json()) as Staff[];
}

function getStaffOptionLabel(staff: UserLinkedStaffRecord) {
	const explicitDisplayName = staff.displayName?.trim();
	if (explicitDisplayName) {
		return explicitDisplayName;
	}

	return (
		[staff.firstname, staff.lastname].filter(Boolean).join(" ").trim() ||
		"Unnamed Staff"
	);
}

function readRoleDescription(role: UserRoleOption) {
	return "description" in role && typeof role.description === "string"
		? role.description
		: undefined;
}

export function UserForm({
	mode,
	offices,
	roles,
	selfServiceRoleIds = [],
	initialData,
	onSubmit,
	onCancel,
}: UserFormProps) {
	const { tenantId } = useTenantStore();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
	const allowedOfficeIds = offices
		.map((office) => office.id)
		.filter((officeId): officeId is number => typeof officeId === "number");
	const availableRoleIds = roles
		.map((role) => role.id)
		.filter((roleId): roleId is number => typeof roleId === "number");

	const {
		register,
		handleSubmit,
		control,
		setValue,
		setError,
		watch,
		formState: { errors },
	} = useForm<UserFormValues>({
		resolver: zodResolver(
			createUserSchema({
				mode,
				allowedOfficeIds,
				availableRoleIds,
			}),
		),
		defaultValues: initialData
			? userRecordToFormValues(initialData)
			: {
					username: "",
					firstname: "",
					lastname: "",
					email: "",
					roles: [],
					sendPasswordToEmail: false,
					passwordNeverExpires: false,
					password: "",
					repeatPassword: "",
				},
	});

	const selectedOfficeId = watch("officeId");
	const selectedStaffId = watch("staffId");
	const selectedRoleIds = watch("roles") ?? [];
	const sendPasswordToEmail = watch("sendPasswordToEmail") ?? false;
	const usernameValue = watch("username");
	const currentLinkedStaffId = getUserLinkedStaffId(initialData);
	const currentLinkedStaff = initialData?.staff;

	const staffQuery = useQuery({
		queryKey: ["user-form-staff", tenantId, selectedOfficeId],
		queryFn: () => fetchActiveOfficeStaff(tenantId, selectedOfficeId),
		enabled: Boolean(tenantId && selectedOfficeId),
		staleTime: 5 * 60 * 1000,
	});

	const staffOptions = (() => {
		if (!selectedOfficeId) {
			return [];
		}

		const merged = new Map<number, UserLinkedStaffRecord>();
		for (const staffMember of staffQuery.data ?? []) {
			if (typeof staffMember.id === "number") {
				merged.set(staffMember.id, staffMember);
			}
		}

		if (
			currentLinkedStaff &&
			typeof currentLinkedStaffId === "number" &&
			selectedOfficeId === initialData?.officeId &&
			!merged.has(currentLinkedStaffId)
		) {
			merged.set(currentLinkedStaffId, currentLinkedStaff);
		}

		return Array.from(merged.values());
	})();

	useEffect(() => {
		if (!selectedOfficeId && selectedStaffId) {
			setValue("staffId", undefined, { shouldValidate: true });
			return;
		}

		if (
			staffQuery.isFetched &&
			selectedStaffId &&
			!staffOptions.some((staffMember) => staffMember.id === selectedStaffId)
		) {
			setValue("staffId", undefined, { shouldValidate: true });
		}
	}, [
		selectedOfficeId,
		selectedStaffId,
		setValue,
		staffOptions,
		staffQuery.isFetched,
	]);

	const toggleRole = (roleId: number) => {
		const nextRoleIds = selectedRoleIds.includes(roleId)
			? selectedRoleIds.filter((selectedRoleId) => selectedRoleId !== roleId)
			: [...selectedRoleIds, roleId];

		setValue("roles", nextRoleIds, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

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

	const onFormSubmit = async (data: UserFormValues) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			if (
				data.staffId &&
				!staffOptions.some((staffMember) => staffMember.id === data.staffId)
			) {
				setError("staffId", {
					type: "manual",
					message: "Select an active staff member in the chosen office",
				});
				return;
			}

			const payload =
				mode === "create"
					? userFormToCreateRequest(data)
					: userFormToUpdateRequest(data);
			await onSubmit(payload);
		} catch (error) {
			const trackedError = toSubmitActionError(error, {
				action: mode === "create" ? "createUser" : "updateUser",
				endpoint:
					mode === "create"
						? BFF_ROUTES.users
						: `${BFF_ROUTES.users}/${initialData?.id}`,
				method: mode === "create" ? "POST" : "PUT",
				tenantId,
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
					mode === "create" ? "Failed to create user" : "Failed to update user"
				}
			/>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Account identity
				</div>
				{mode === "create" ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="username">
								Username <span className="text-destructive">*</span>
							</Label>
							<Input
								id="username"
								{...register("username")}
								placeholder="Enter login username"
							/>
							{errors.username && (
								<p className="text-sm text-destructive">
									{errors.username.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">
								Email <span className="text-destructive">*</span>
							</Label>
							<Input
								id="email"
								type="email"
								{...register("email")}
								placeholder="user@example.com"
							/>
							{errors.email && (
								<p className="text-sm text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="username-readonly">Username</Label>
							<Input
								id="username-readonly"
								value={usernameValue}
								readOnly
								disabled
							/>
							<p className="text-xs text-muted-foreground">
								Usernames are created once and are not editable here.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">
								Email <span className="text-destructive">*</span>
							</Label>
							<Input
								id="email"
								type="email"
								{...register("email")}
								placeholder="user@example.com"
							/>
							{errors.email && (
								<p className="text-sm text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>
					</div>
				)}

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
						<Label htmlFor="staffId">Linked Staff</Label>
						<Controller
							control={control}
							name="staffId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : "none"}
									onValueChange={(value) =>
										field.onChange(value === "none" ? undefined : Number(value))
									}
									disabled={!selectedOfficeId || staffQuery.isLoading}
								>
									<SelectTrigger id="staffId">
										<SelectValue
											placeholder={
												!selectedOfficeId
													? "Select office first"
													: staffQuery.isLoading
														? "Loading active staff"
														: "Optional staff link"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No linked staff</SelectItem>
										{staffOptions.map((staffMember) => (
											<SelectItem
												key={staffMember.id}
												value={String(staffMember.id)}
											>
												{getStaffOptionLabel(staffMember)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-xs text-muted-foreground">
							After selecting an office, only active staff in that office are
							available for linking.
						</p>
						{staffQuery.error && (
							<p className="text-sm text-destructive">
								Unable to load active staff for the selected office.
							</p>
						)}
						{errors.staffId && (
							<p className="text-sm text-destructive">
								{errors.staffId.message}
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Role assignments
				</div>
				<div className="space-y-2">
					<Label>
						Roles <span className="text-destructive">*</span>
					</Label>
					<div className="max-h-56 space-y-2 overflow-y-auto rounded-sm border border-border/60 p-3">
						{roles.map((role) => {
							if (typeof role.id !== "number") {
								return null;
							}

							const isSelfServiceRole = selfServiceRoleIds.includes(role.id);
							return (
								<div key={role.id} className="flex items-start gap-2">
									<Checkbox
										id={`role-${role.id}`}
										checked={selectedRoleIds.includes(role.id)}
										onCheckedChange={() => toggleRole(role.id!)}
									/>
									<Label
										htmlFor={`role-${role.id}`}
										className="flex-1 cursor-pointer space-y-1"
									>
										<div className="flex items-center gap-2">
											<span className="font-medium">{role.name}</span>
											{isSelfServiceRole && (
												<Badge variant="outline">Self Service</Badge>
											)}
										</div>
										{readRoleDescription(role) && (
											<div className="text-xs text-muted-foreground">
												{readRoleDescription(role)}
											</div>
										)}
									</Label>
								</div>
							);
						})}
					</div>
					{errors.roles && (
						<p className="text-sm text-destructive">{errors.roles.message}</p>
					)}
				</div>
			</div>

			<div className="space-y-4">
				<div className="text-sm font-semibold text-muted-foreground">
					Credentials
				</div>
				{mode === "create" && (
					<div className="space-y-3 rounded-sm border border-border/60 p-4">
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
								Send generated password by email
							</Label>
						</div>
						<p className="text-xs text-muted-foreground">
							If this is enabled, password fields become optional and the system
							can deliver initial credentials by email.
						</p>

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
				)}

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="password">
							Password
							{mode === "create" && !sendPasswordToEmail && (
								<span className="text-destructive"> *</span>
							)}
						</Label>
						<Input
							id="password"
							type="password"
							{...register("password")}
							placeholder={
								mode === "create" && sendPasswordToEmail
									? "Optional when emailed"
									: mode === "edit"
										? "Leave blank to keep current password"
										: "Enter password"
							}
						/>
						<p className="text-xs text-muted-foreground">
							{mode === "edit"
								? "Leave both password fields blank to keep the current password."
								: FINERACT_PASSWORD_MESSAGE}
						</p>
						{errors.password && (
							<p className="text-sm text-destructive">
								{errors.password.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="repeatPassword">
							Confirm Password
							{mode === "create" && !sendPasswordToEmail && (
								<span className="text-destructive"> *</span>
							)}
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
						? mode === "create"
							? "Creating..."
							: "Saving..."
						: mode === "create"
							? "Create User"
							: "Update User"}
				</Button>
			</div>
		</form>
	);
}
