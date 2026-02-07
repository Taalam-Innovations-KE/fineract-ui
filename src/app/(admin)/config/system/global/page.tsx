"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import { mapFineractError } from "@/lib/fineract/error-mapping";
import type {
	GetGlobalConfigurationsResponse,
	GlobalConfigurationPropertyData,
	PutGlobalConfigurationsRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchConfigurations(
	tenantId: string,
): Promise<GetGlobalConfigurationsResponse> {
	const response = await fetch(BFF_ROUTES.configurations, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}

	return response.json();
}

async function updateConfiguration(
	tenantId: string,
	configId: number,
	updates: PutGlobalConfigurationsRequest,
): Promise<void> {
	const response = await fetch(`${BFF_ROUTES.configurations}/${configId}`, {
		method: "PUT",
		headers: {
			"x-tenant-id": tenantId,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(updates),
	});

	if (!response.ok) {
		throw (await response.json()) as unknown;
	}
}

export default function GlobalConfigurationPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const {
		data: configResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["global-configurations", tenantId],
		queryFn: () => fetchConfigurations(tenantId),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			configId,
			updates,
		}: {
			configId: number;
			updates: PutGlobalConfigurationsRequest;
		}) => updateConfiguration(tenantId, configId, updates),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["global-configurations"] });
			setToastMessage("Configuration updated successfully");
		},
		onError: (error) => {
			setToastMessage(mapFineractError(error).message);
		},
	});

	const configurations = configResponse?.globalConfiguration || [];

	useEffect(() => {
		if (toastMessage) {
			const timer = setTimeout(() => setToastMessage(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toastMessage]);

	const handleUpdate = (config: GlobalConfigurationPropertyData) => {
		if (!config.id) return;

		const updates: PutGlobalConfigurationsRequest = {};

		if (config.enabled !== undefined) {
			updates.enabled = config.enabled;
		}
		if (config.value !== undefined) {
			updates.value = config.value;
		}
		if (config.stringValue !== undefined) {
			updates.stringValue = config.stringValue;
		}
		if (config.dateValue !== undefined) {
			updates.dateValue = config.dateValue;
		}

		updateMutation.mutate({ configId: config.id, updates });
	};

	if (isLoading) {
		return (
			<PageShell title="Global Configuration" subtitle="Loading...">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell
				title="Global Configuration"
				subtitle="Configure global settings"
			>
				<Alert>
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						Failed to load global configurations. Please try again.
					</AlertDescription>
				</Alert>
			</PageShell>
		);
	}

	return (
		<PageShell
			title="Global Configuration"
			subtitle="Configure global settings and system-wide preferences"
		>
			<div className="space-y-6">
				{configurations.map((config) => (
					<GlobalConfigItem
						key={config.id}
						config={config}
						onUpdate={handleUpdate}
						isUpdating={updateMutation.isPending}
					/>
				))}
			</div>

			{toastMessage && (
				<div className="fixed bottom-4 right-4 z-50">
					<Alert>
						<AlertTitle>Notification</AlertTitle>
						<AlertDescription>{toastMessage}</AlertDescription>
					</Alert>
				</div>
			)}
		</PageShell>
	);
}

interface GlobalConfigItemProps {
	config: GlobalConfigurationPropertyData;
	onUpdate: (config: GlobalConfigurationPropertyData) => void;
	isUpdating: boolean;
}

function GlobalConfigItem({
	config,
	onUpdate,
	isUpdating,
}: GlobalConfigItemProps) {
	const [localConfig, setLocalConfig] = useState(config);

	useEffect(() => {
		setLocalConfig(config);
	}, [config]);

	const handleSave = () => {
		onUpdate(localConfig);
	};

	const hasChanges =
		localConfig.enabled !== config.enabled ||
		localConfig.value !== config.value ||
		localConfig.stringValue !== config.stringValue ||
		localConfig.dateValue !== config.dateValue;

	return (
		<div className="border rounded-lg p-6 space-y-4">
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<h3 className="text-lg font-semibold">{config.name}</h3>
					<p className="text-sm text-muted-foreground">{config.description}</p>
				</div>
				{config.enabled !== undefined && (
					<div className="flex items-center space-x-2">
						<Checkbox
							id={`enabled-${config.id}`}
							checked={localConfig.enabled || false}
							onCheckedChange={(checked: boolean) =>
								setLocalConfig({ ...localConfig, enabled: checked })
							}
						/>
						<Label htmlFor={`enabled-${config.id}`}>Enabled</Label>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{config.value !== undefined && (
					<div className="space-y-2">
						<Label htmlFor={`value-${config.id}`}>Numeric Value</Label>
						<Input
							id={`value-${config.id}`}
							type="number"
							value={localConfig.value || ""}
							onChange={(e) =>
								setLocalConfig({
									...localConfig,
									value: parseFloat(e.target.value) || 0,
								})
							}
						/>
					</div>
				)}

				{config.stringValue !== undefined && (
					<div className="space-y-2">
						<Label htmlFor={`string-${config.id}`}>String Value</Label>
						<Input
							id={`string-${config.id}`}
							value={localConfig.stringValue || ""}
							onChange={(e) =>
								setLocalConfig({ ...localConfig, stringValue: e.target.value })
							}
						/>
					</div>
				)}

				{config.dateValue !== undefined && (
					<div className="space-y-2">
						<Label htmlFor={`date-${config.id}`}>Date Value</Label>
						<Input
							id={`date-${config.id}`}
							type="date"
							value={localConfig.dateValue || ""}
							onChange={(e) =>
								setLocalConfig({ ...localConfig, dateValue: e.target.value })
							}
						/>
					</div>
				)}
			</div>

			{hasChanges && (
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={isUpdating}>
						<Save className="w-4 h-4 mr-2" />
						{isUpdating ? "Updating..." : "Save Changes"}
					</Button>
				</div>
			)}
		</div>
	);
}
