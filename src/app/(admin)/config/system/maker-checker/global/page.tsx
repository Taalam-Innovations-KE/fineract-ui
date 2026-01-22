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
import type {
	MakerCheckerEntry,
	SuperCheckerUser,
} from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function GlobalPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const { globalConfig, setGlobalConfig } = useMakerCheckerStore();

	useEffect(() => {
		async function loadConfig() {
			try {
				const response = await fetch("/api/maker-checker/global");
				const config = await response.json();
				setGlobalConfig(config);
			} catch (error) {
				console.error("Failed to load global configuration:", error);
			} finally {
				setLoading(false);
			}
		}
		loadConfig();
	}, [setGlobalConfig]);

	const handleToggle = async (enabled: boolean) => {
		setSaving(true);
		try {
			const response = await fetch("/api/maker-checker/global", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ enabled }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update global config");
			}

			setGlobalConfig({ enabled });
			console.log(
				`Maker checker ${enabled ? "enabled" : "disabled"} globally.`,
			);
		} catch (error) {
			console.error("Failed to update global configuration:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleSuperCheckerToggle = async (
		user: SuperCheckerUser,
		isSuperChecker: boolean,
	) => {
		setSuperCheckerSaving(user.id);
		try {
			const response = await fetch("/api/maker-checker/super-checkers", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.id, isSuperChecker }),
			});

			if (!response.ok)
				throw new Error("Failed to update super checker status");

			updateSuperCheckerStatus(user.id, isSuperChecker);
			// Refresh impact data
			const impactRes = await fetch(
				"/api/maker-checker/super-checkers?type=impact",
			);
			const impactData = await impactRes.json();
			setImpact(impactData);
		} catch (error) {
			console.error("Failed to update super checker status:", error);
		} finally {
			setSuperCheckerSaving(null);
		}
	};

	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Global Maker Checker Settings</h1>
				<p className="text-muted-foreground">
					Control maker-checker system settings and manage super checker users.
				</p>
			</div>

			{/* Impact Overview */}
			{impact && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<Card>
						<CardContent className="p-6">
							<div className="text-3xl font-bold">
								{impact.totalPermissions}
							</div>
							<div className="text-sm text-muted-foreground">
								Total Permissions
							</div>
							<div className="mt-2">
								<div className="text-sm">
									<span className="text-green-600 font-medium">
										{impact.enabledPermissions} enabled
									</span>
									<span className="text-muted-foreground"> • </span>
									<span className="text-muted-foreground">
										{Math.round(
											(impact.enabledPermissions / impact.totalPermissions) *
												100,
										)}
										%
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="text-3xl font-bold">{impact.totalUsers}</div>
							<div className="text-sm text-muted-foreground">Total Users</div>
							<div className="mt-2">
								<div className="text-sm">
									<span className="text-blue-600 font-medium">
										{impact.superCheckerUsers} super checkers
									</span>
									<span className="text-muted-foreground"> • </span>
									<span className="text-muted-foreground">
										{Math.round(
											(impact.superCheckerUsers / impact.totalUsers) * 100,
										)}
										%
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="text-3xl font-bold text-orange-600">
								{impact.pendingApprovals}
							</div>
							<div className="text-sm text-muted-foreground">
								Pending Approvals
							</div>
							<div className="mt-2">
								<div className="text-sm text-muted-foreground">
									{impact.pendingApprovals > 0
										? "Requires attention"
										: "All caught up"}
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="text-3xl font-bold text-green-600">
								{impact.enabledPermissions > 0 ? "Active" : "Inactive"}
							</div>
							<div className="text-sm text-muted-foreground">System Status</div>
							<div className="mt-2">
								<div className="text-sm text-muted-foreground">
									Maker-checker{" "}
									{globalConfig?.enabled
										? "enabled globally"
										: "disabled globally"}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* System Health & Recommendations */}
			{impact && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>System Health & Recommendations</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{impact.enabledPermissions === 0 && (
								<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div className="flex">
										<div className="flex-shrink-0">
											<span className="text-yellow-400">⚠️</span>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-yellow-800">
												No permissions configured for maker-checker
											</h3>
											<div className="mt-2 text-sm text-yellow-700">
												Configure permissions in the{" "}
												<a
													href="/config/system/maker-checker/tasks"
													className="underline"
												>
													Tasks page
												</a>{" "}
												to enable maker-checker functionality.
											</div>
										</div>
									</div>
								</div>
							)}

							{impact.superCheckerUsers === 0 &&
								impact.enabledPermissions > 0 && (
									<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
										<div className="flex">
											<div className="ml-3">
												<h3 className="text-sm font-medium text-blue-800">
													Consider designating super checker users
												</h3>
												<div className="mt-2 text-sm text-blue-700">
													Super checkers can approve any operation, providing
													flexibility for administrators.
												</div>
											</div>
										</div>
									</div>
								)}

							{impact.pendingApprovals > 10 && (
								<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
									<div className="flex">
										<div className="flex-shrink-0">
											<span className="text-red-400">🚨</span>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-red-800">
												High volume of pending approvals
											</h3>
											<div className="mt-2 text-sm text-red-700">
												{impact.pendingApprovals} approvals are pending. Check
												the{" "}
												<a
													href="/config/system/maker-checker/inbox"
													className="underline"
												>
													inbox
												</a>{" "}
												to process them.
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Global Toggle */}
			<Card>
				<CardHeader>
					<CardTitle>Maker Checker System</CardTitle>
					<CardDescription>
						When enabled, operations configured for maker checker will require
						approval before execution.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center space-x-2">
						<Checkbox
							checked={globalConfig?.enabled || false}
							onCheckedChange={handleToggle}
							disabled={saving}
						/>
						<label
							htmlFor="maker-checker-toggle"
							className="text-sm font-medium"
						>
							Enable Maker Checker Globally
						</label>
					</div>
					{saving && <p className="text-sm text-muted-foreground">Saving...</p>}
				</CardContent>
			</Card>

			{/* Super Checker Management */}
			<Card>
				<CardHeader>
					<CardTitle>Super Checker Users</CardTitle>
					<CardDescription>
						Super checkers can approve any maker-checker operation regardless of
						their normal permissions. This is useful for administrators or
						compliance officers.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{superCheckerUsers.map((user) => (
							<div
								key={user.id}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="flex items-center space-x-4">
									<div>
										<div className="font-medium">
											{user.displayName || user.username}
										</div>
										<div className="text-sm text-muted-foreground">
											{user.email} • {user.officeName}
										</div>
									</div>
									{user.isSuperChecker && (
										<Badge variant="secondary">Super Checker</Badge>
									)}
								</div>
								<div className="flex items-center space-x-2">
									<label className="text-sm">Super Checker</label>
									<Checkbox
										checked={user.isSuperChecker}
										onCheckedChange={(checked) =>
											handleSuperCheckerToggle(user, checked as boolean)
										}
										disabled={superCheckerSaving === user.id}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Recent Activity */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>
						Latest maker-checker operations across the system.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{recentActivity.length === 0 ? (
						<p className="text-muted-foreground">No recent activity.</p>
					) : (
						<div className="space-y-3">
							{recentActivity.map((entry) => (
								<div
									key={entry.auditId}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="flex items-center space-x-3">
										<div
											className={`w-2 h-2 rounded-full ${
												entry.processingResult === "approved"
													? "bg-green-500"
													: entry.processingResult === "rejected"
														? "bg-red-500"
														: "bg-yellow-500"
											}`}
										/>
										<div>
											<p className="text-sm font-medium">
												{entry.entityName} #{entry.resourceId}
											</p>
											<p className="text-xs text-muted-foreground">
												Maker: {entry.makerId}
												{entry.checkerId && ` • Checker: ${entry.checkerId}`}
											</p>
										</div>
									</div>
									<div className="text-right">
										<Badge
											variant={
												entry.processingResult === "approved"
													? "default"
													: entry.processingResult === "rejected"
														? "destructive"
														: "secondary"
											}
											className="text-xs"
										>
											{entry.processingResult}
										</Badge>
										<p className="text-xs text-muted-foreground mt-1">
											{new Date(entry.madeOnDate).toLocaleDateString()}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
					{recentActivity.length > 0 && (
						<div className="mt-4 text-center">
							<Button variant="outline" size="sm" asChild>
								<a href="/config/system/maker-checker/inbox">
									View All Activity
								</a>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
