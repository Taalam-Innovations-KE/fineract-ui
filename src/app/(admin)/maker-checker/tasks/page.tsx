"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { Permission } from "@/lib/fineract/maker-checker";
import {
	getPermissions,
	updateBulkPermissions,
	updatePermissions,
} from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function TasksPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [bulkSaving, setBulkSaving] = useState(false);
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

	const handleGroupToggle = (group: string, selected: boolean) => {
		const groupPerms = permissions.filter((p) => p.grouping === group);
		groupPerms.forEach((perm) => updatePermission(perm.code, selected));
	};

	const handleBulkEnable = async (codes: string[]) => {
		setBulkSaving(true);
		try {
			await updateBulkPermissions(codes, true);
			codes.forEach((code) => updatePermission(code, true));
		} catch (error) {
			console.error("Failed to bulk enable permissions:", error);
		} finally {
			setBulkSaving(false);
		}
	};

	const handleBulkDisable = async (codes: string[]) => {
		setBulkSaving(true);
		try {
			await updateBulkPermissions(codes, false);
			codes.forEach((code) => updatePermission(code, false));
		} catch (error) {
			console.error("Failed to bulk disable permissions:", error);
		} finally {
			setBulkSaving(false);
		}
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

	const getGroupStats = (groupPerms: Permission[]) => {
		const enabled = groupPerms.filter((p) => p.selected).length;
		const total = groupPerms.length;
		return { enabled, total };
	};

	const getAllEnabledCodes = () =>
		permissions.filter((p) => p.selected).map((p) => p.code);
	const getAllDisabledCodes = () =>
		permissions.filter((p) => !p.selected).map((p) => p.code);

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

			{/* Bulk Operations */}
			<Card>
				<CardHeader>
					<CardTitle>Bulk Operations</CardTitle>
					<CardDescription>
						Quickly enable or disable maker-checker for multiple permissions.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 flex-wrap">
						<Button
							variant="outline"
							onClick={() => handleBulkEnable(getAllDisabledCodes())}
							disabled={bulkSaving || getAllDisabledCodes().length === 0}
						>
							Enable All Remaining
						</Button>
						<Button
							variant="outline"
							onClick={() => handleBulkDisable(getAllEnabledCodes())}
							disabled={bulkSaving || getAllEnabledCodes().length === 0}
						>
							Disable All Enabled
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Permission Groups */}
			<Card>
				<CardHeader>
					<CardTitle>Permission Groups</CardTitle>
					<CardDescription>
						Configure maker-checker settings by functional area.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{Object.entries(groupedPermissions).map(([group, perms]) => {
							const stats = getGroupStats(perms);
							const allSelected = stats.enabled === stats.total;
							const noneSelected = stats.enabled === 0;

							return (
								<div key={group} className="border rounded-lg p-4">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center space-x-4">
											<Checkbox
												checked={allSelected}
												onCheckedChange={(checked) =>
													handleGroupToggle(group, checked as boolean)
												}
											/>
											{!allSelected && !noneSelected && (
												<span className="text-xs text-muted-foreground ml-1">
													({stats.enabled} selected)
												</span>
											)}
											<h3 className="font-semibold">{group}</h3>
											<Badge variant="secondary">
												{stats.enabled}/{stats.total} enabled
											</Badge>
										</div>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleBulkEnable(
														perms.filter((p) => !p.selected).map((p) => p.code),
													)
												}
												disabled={stats.enabled === stats.total}
											>
												Enable All
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleBulkDisable(
														perms.filter((p) => p.selected).map((p) => p.code),
													)
												}
												disabled={stats.enabled === 0}
											>
												Disable All
											</Button>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-8">
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
							);
						})}
					</div>

					<Separator className="my-4" />

					<div className="flex justify-end">
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save All Changes"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
