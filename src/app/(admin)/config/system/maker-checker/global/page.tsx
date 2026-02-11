"use client";

import { useEffect, useState } from "react";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function GlobalPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);
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
		setSubmitError(null);
		try {
			const response = await fetch("/api/maker-checker/global", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ enabled }),
			});

			if (!response.ok) {
				const errorPayload = await response
					.json()
					.catch(() => ({ message: "Failed to update global config" }));
				throw errorPayload;
			}

			setGlobalConfig({ enabled });
			console.log(
				`Maker checker ${enabled ? "enabled" : "disabled"} globally.`,
			);
		} catch (error) {
			setSubmitError(
				toSubmitActionError(error, {
					action: "updateMakerCheckerGlobalConfig",
					endpoint: "/api/maker-checker/global",
					method: "PUT",
				}),
			);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-72" />
					<Skeleton className="h-4 w-[32rem]" />
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-[30rem]" />
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-4 rounded-sm" />
							<Skeleton className="h-4 w-52" />
						</div>
						<Skeleton className="h-16 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Global Maker Checker Settings</h1>
				<p className="text-muted-foreground">
					Control whether the maker checker system is enabled across the entire
					platform.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Maker Checker System</CardTitle>
					<CardDescription>
						When enabled, operations configured for maker checker will require
						approval before execution. Configure specific permissions in the{" "}
						<a
							href="/config/system/maker-checker/tasks"
							className="underline text-blue-600"
						>
							Tasks page
						</a>
						.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SubmitErrorAlert
						error={submitError}
						title="Failed to update global configuration"
					/>
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
					{globalConfig?.enabled && (
						<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
							<p className="text-sm text-green-800">
								Maker-checker is enabled. Operations configured with
								maker-checker permissions will require approval.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
