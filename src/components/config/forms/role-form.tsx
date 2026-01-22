"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GetRolesResponse } from "@/lib/fineract/generated/types.gen";

type RoleFormData = {
	description?: string;
};

interface RoleFormProps {
	initialData?: GetRolesResponse | null;
	onSubmit: (data: RoleFormData) => Promise<void>;
	onCancel: () => void;
}

export function RoleForm({ initialData, onSubmit, onCancel }: RoleFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { register, handleSubmit } = useForm<RoleFormData>({
		defaultValues: {
			description: initialData?.description || "",
		},
	});

	const onFormSubmit = async (data: RoleFormData) => {
		setIsSubmitting(true);
		try {
			await onSubmit({ description: data.description || "" });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="role-name">Role Name</Label>
				<Input
					id="role-name"
					value={initialData?.name || ""}
					disabled
					readOnly
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="role-description">Description</Label>
				<Input
					id="role-description"
					placeholder="Describe this role"
					{...register("description")}
				/>
			</div>
			<div className="flex justify-end gap-3 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</form>
	);
}
