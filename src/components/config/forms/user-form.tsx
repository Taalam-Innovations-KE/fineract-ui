"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
	GetRolesResponse,
	OfficeData,
	PostUsersRequest,
	Staff,
} from "@/lib/fineract/generated/types.gen";
import {
	type CreateUserFormData,
	createUserSchema,
	userFormToRequest,
} from "@/lib/schemas/user";

interface UserFormProps {
	offices: OfficeData[];
	staff: Staff[];
	roles: GetRolesResponse[];
	onSubmit: (data: PostUsersRequest) => Promise<void>;
	onCancel: () => void;
}

export function UserForm({
	offices,
	staff,
	roles,
	onSubmit,
	onCancel,
}: UserFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
		setValue,
		watch,
	} = useForm<CreateUserFormData>({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			roles: [],
		},
	});

	const selectedOfficeId = watch("officeId");
	const filteredStaff = selectedOfficeId
		? staff.filter((s) => s.office?.id === selectedOfficeId)
		: staff;

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

	const onFormSubmit = async (data: CreateUserFormData) => {
		setIsSubmitting(true);
		try {
			const requestData = userFormToRequest(data);
			await onSubmit(requestData);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="username">
						Username <span className="text-destructive">*</span>
					</Label>
					<Input
						id="username"
						{...register("username")}
						placeholder="Enter username"
					/>
					{errors.username && (
						<p className="text-sm text-destructive">
							{errors.username.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						{...register("email")}
						placeholder="user@example.com"
					/>
					{errors.email && (
						<p className="text-sm text-destructive">{errors.email.message}</p>
					)}
				</div>
			</div>

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

			<div className="grid grid-cols-2 gap-4">
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
					<Label htmlFor="staffId">Link to Staff (Optional)</Label>
					<Controller
						control={control}
						name="staffId"
						render={({ field }) => (
							<Select
								value={
									field.value !== undefined && field.value !== null
										? String(field.value)
										: "none"
								}
								onValueChange={(value) =>
									field.onChange(value === "none" ? undefined : Number(value))
								}
								disabled={!selectedOfficeId}
							>
								<SelectTrigger id="staffId">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{filteredStaff.map((member) => (
										<SelectItem key={member.id} value={String(member.id)}>
											{member.displayName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
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

			<div className="grid grid-cols-2 gap-4">
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

				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="isSelfServiceUser"
						render={({ field }) => (
							<Checkbox
								id="isSelfServiceUser"
								checked={field.value ?? false}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
							/>
						)}
					/>
					<Label htmlFor="isSelfServiceUser" className="cursor-pointer">
						Self-service user
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
					{isSubmitting ? "Creating..." : "Create User"}
				</Button>
			</div>
		</form>
	);
}
