"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KpiBreakdown {
	charged?: number;
	paid?: number;
	waived?: number;
	writtenOff?: number;
}

interface KpiCardProps {
	label: string;
	value: number | undefined;
	currency?: string;
	icon?: LucideIcon;
	breakdown?: KpiBreakdown;
	variant?: "default" | "warning" | "danger" | "success";
	isLoading?: boolean;
	className?: string;
}

function formatAmount(amount: number | undefined, currency = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	return `${currency} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatCompact(amount: number | undefined, currency = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	if (amount >= 1000000) {
		return `${currency} ${(amount / 1000000).toFixed(2)}M`;
	}
	if (amount >= 1000) {
		return `${currency} ${(amount / 1000).toFixed(1)}K`;
	}
	return `${currency} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function KpiCard({
	label,
	value,
	currency = "KES",
	icon: Icon,
	breakdown,
	variant = "default",
	isLoading,
	className,
}: KpiCardProps) {
	const variantStyles = {
		default: "border-l-4 border-l-border",
		warning: "border-l-4 border-l-yellow-500 bg-yellow-50/50",
		danger: "border-l-4 border-l-red-500 bg-red-50/50",
		success: "border-l-4 border-l-green-500 bg-green-50/50",
	};

	const iconStyles = {
		default: "text-muted-foreground",
		warning: "text-yellow-600",
		danger: "text-red-600",
		success: "text-green-600",
	};

	const hasBreakdown =
		breakdown &&
		(breakdown.charged !== undefined ||
			breakdown.paid !== undefined ||
			breakdown.waived !== undefined ||
			breakdown.writtenOff !== undefined);

	if (isLoading) {
		return (
			<Card className={cn("h-full", variantStyles.default, className)}>
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-6 w-32" />
						</div>
						{Icon && <Skeleton className="h-5 w-5 rounded" />}
					</div>
				</CardContent>
			</Card>
		);
	}

	const content = (
		<Card className={cn("h-full", variantStyles[variant], className)}>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</p>
						<p className="text-lg font-semibold font-mono">
							{formatCompact(value, currency)}
						</p>
					</div>
					{Icon && <Icon className={cn("h-5 w-5", iconStyles[variant])} />}
				</div>
			</CardContent>
		</Card>
	);

	if (!hasBreakdown) {
		return content;
	}

	return (
		<div className="h-full">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="cursor-help h-full">{content}</div>
					</TooltipTrigger>
					<TooltipContent className="p-3">
						<div className="space-y-1 text-xs">
							{breakdown.charged !== undefined && (
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">Charged:</span>
									<span className="font-mono">
										{formatAmount(breakdown.charged, currency)}
									</span>
								</div>
							)}
							{breakdown.paid !== undefined && (
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">Paid:</span>
									<span className="font-mono text-green-600">
										{formatAmount(breakdown.paid, currency)}
									</span>
								</div>
							)}
							{breakdown.waived !== undefined && breakdown.waived > 0 && (
								<div className="flex justify-between gap-4">
									<span className="text-muted-foreground">Waived:</span>
									<span className="font-mono text-blue-600">
										{formatAmount(breakdown.waived, currency)}
									</span>
								</div>
							)}
							{breakdown.writtenOff !== undefined &&
								breakdown.writtenOff > 0 && (
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">Written Off:</span>
										<span className="font-mono text-orange-600">
											{formatAmount(breakdown.writtenOff, currency)}
										</span>
									</div>
								)}
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}

export function KpiCardSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn("h-full border-l-4 border-l-border", className)}>
			<CardContent className="p-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-6 w-32" />
				</div>
			</CardContent>
		</Card>
	);
}
