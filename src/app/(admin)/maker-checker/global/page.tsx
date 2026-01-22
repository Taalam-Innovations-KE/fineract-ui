"use client";

import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	getGlobalConfig,
	updateGlobalConfig,
} from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function GlobalPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const { globalConfig, setGlobalConfig } = useMakerCheckerStore();

	useEffect(() => {
		async function loadConfig() {
			try {
				const config = await getGlobalConfig();
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
			await updateGlobalConfig(enabled);
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

	if (loading) {
		return <div>Loading...</div>;
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
							Enable Maker Checker
						</label>
					</div>
					{saving && <p className="text-sm text-muted-foreground">Saving...</p>}
				</CardContent>
			</Card>
		</div>
	);
}
