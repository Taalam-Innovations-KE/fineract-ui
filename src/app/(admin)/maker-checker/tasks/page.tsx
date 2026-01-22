"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Permission } from "@/lib/fineract/maker-checker";
import {
	getPermissions,
	updatePermissions,
} from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function TasksPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const { permissions, setPermissions, updatePermission } =
		useMakerCheckerStore();

	useEffect(() => {
		async function loadPermissions() {
			try {
				const perms = await getPermissions();
				setPermissions(perms);
			} catch (error) {
				console.error("Failed to load permissions:", error);
			} finally {
				setLoading(false);
			}
		}
		loadPermissions();
	}, [setPermissions]);

	const handleToggle = (code: string, selected: boolean) => {
		updatePermission(code, selected);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const updates = permissions.map((p) => ({
				code: p.code,
				selected: p.selected,
			}));
			await updatePermissions(updates);
			console.log("Permissions updated successfully.");
		} catch (error) {
			console.error("Failed to update permissions:", error);
		} finally {
			setSaving(false);
		}
	};

	const groupedPermissions = permissions.reduce(
		(acc, perm) => {
			if (!acc[perm.grouping]) acc[perm.grouping] = [];
			acc[perm.grouping].push(perm);
			return acc;
		},
		{} as Record<string, Permission[]>,
	);

	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Configure Maker-Checker Tasks</h1>
				<p className="text-muted-foreground">
					Select which operations require maker checker approval.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Permissions</CardTitle>
					<CardDescription>
						Operations grouped by category. Checked items will require approval.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{Object.entries(groupedPermissions).map(([group, perms]) => (
							<div key={group}>
								<h3 className="font-semibold">{group}</h3>
								<div className="space-y-2 ml-4">
									{perms.map((perm) => (
										<div
											key={perm.code}
											className="flex items-center space-x-2"
										>
											<Checkbox
												checked={perm.selected}
												onCheckedChange={(checked) =>
													handleToggle(perm.code, checked as boolean)
												}
											/>
											<label className="text-sm">{perm.code}</label>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
					<div className="mt-4">
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
