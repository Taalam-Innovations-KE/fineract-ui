"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getMissingReportParameterDependencies,
	getReportParameterMetadata,
	type ReportParameter,
	type ReportParameterOption,
} from "@/lib/fineract/reports";

interface ReportParameterFieldsProps {
	parameters: ReportParameter[];
	formValues: Record<string, string>;
	requestValues: Record<string, string>;
	onValueChange: (parameterName: string, value: string) => void;
	parameterOptions: Record<string, ReportParameterOption[]>;
	isLoadingOptions: boolean;
}

interface ReportParameterFieldsSkeletonProps {
	fieldCount?: number;
}

function formatDependencyLabel(dependency: string) {
	return dependency
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\bId\b/g, "")
		.trim()
		.toLowerCase();
}

export function ReportParameterFieldsSkeleton({
	fieldCount = 4,
}: ReportParameterFieldsSkeletonProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{Array.from({ length: fieldCount }).map((_, index) => (
				<div key={`report-parameter-skeleton-${index}`} className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-40" />
					<Skeleton className="h-3 w-28" />
				</div>
			))}
		</div>
	);
}

export function ReportParameterFields({
	parameters,
	formValues,
	requestValues,
	onValueChange,
	parameterOptions,
	isLoadingOptions,
}: ReportParameterFieldsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{parameters.map((parameter) => {
				const parameterName = parameter.parameterName || "";
				const metadata = getReportParameterMetadata(parameter);
				const options = parameterOptions[parameterName] || [];
				const missingDependencies = getMissingReportParameterDependencies(
					metadata,
					requestValues,
				);
				const showFallbackInput =
					metadata.control === "select" &&
					!isLoadingOptions &&
					options.length === 0 &&
					missingDependencies.length === 0;
				const dependencyHint =
					missingDependencies.length > 0
						? `Select ${missingDependencies
								.map(formatDependencyLabel)
								.join(", ")} first to load options.`
						: null;

				return (
					<div key={parameterName} className="space-y-2">
						<Label htmlFor={parameterName}>{metadata.label} *</Label>

						{metadata.control === "select" && !showFallbackInput ? (
							isLoadingOptions &&
							metadata.optionSource === "parameterType" &&
							missingDependencies.length === 0 ? (
								<Skeleton className="h-10 w-full" />
							) : (
								<Select
									disabled={missingDependencies.length > 0}
									value={formValues[parameterName] || ""}
									onValueChange={(value) => onValueChange(parameterName, value)}
								>
									<SelectTrigger id={parameterName}>
										<SelectValue
											placeholder={
												dependencyHint ||
												`Select ${metadata.label.toLowerCase()}`
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{metadata.allowAll && metadata.allValue ? (
											<SelectItem value={metadata.allValue}>All</SelectItem>
										) : null}
										{options.map((option) => (
											<SelectItem
												key={`${parameterName}-${option.value}`}
												value={option.value}
											>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)
						) : (
							<Input
								id={parameterName}
								type={
									metadata.control === "number"
										? "number"
										: metadata.control === "date"
											? "date"
											: "text"
								}
								value={formValues[parameterName] || ""}
								onChange={(event) =>
									onValueChange(parameterName, event.target.value)
								}
								placeholder={metadata.placeholder || metadata.description}
							/>
						)}

						<div className="text-xs text-muted-foreground">
							{metadata.description}
						</div>
						{dependencyHint ? (
							<div className="text-[11px] text-muted-foreground">
								{dependencyHint}
							</div>
						) : null}
						<div className="text-[11px] text-muted-foreground">
							Request key: <code>R_{metadata.requestKey}</code>
						</div>
					</div>
				);
			})}
		</div>
	);
}
