"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MoneyBreakdown {
	charged?: number;
	paid?: number;
	waived?: number;
	writtenOff?: number;
	outstanding?: number;
}

interface MoneyCellProps {
	amount: number | undefined;
	currency?: string;
	breakdown?: MoneyBreakdown;
	variant?: "default" | "positive" | "negative" | "muted";
	className?: string;
	showTooltip?: boolean;
}

function formatAmount(amount: number | undefined, currency = "KES"): string {
	if (amount === undefined || amount === null) return "—";
	return `${currency} ${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function MoneyCell({
	amount,
	currency = "KES",
	breakdown,
	variant = "default",
	className,
	showTooltip = true,
}: MoneyCellProps) {
	const variantClasses = {
		default: "",
		positive: "text-green-600",
		negative: "text-red-600",
		muted: "text-muted-foreground",
	};

	const formattedAmount = formatAmount(amount, currency);
	const hasBreakdown =
		breakdown &&
		(breakdown.charged !== undefined ||
			breakdown.paid !== undefined ||
			breakdown.waived !== undefined ||
			breakdown.writtenOff !== undefined);

	if (!hasBreakdown || !showTooltip) {
		return (
			<span
				className={cn("font-mono text-sm", variantClasses[variant], className)}
			>
				{formattedAmount}
			</span>
		);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						className={cn(
							"font-mono text-sm cursor-help underline decoration-dotted",
							variantClasses[variant],
							className,
						)}
					>
						{formattedAmount}
					</span>
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
						{breakdown.writtenOff !== undefined && breakdown.writtenOff > 0 && (
							<div className="flex justify-between gap-4">
								<span className="text-muted-foreground">Written Off:</span>
								<span className="font-mono text-orange-600">
									{formatAmount(breakdown.writtenOff, currency)}
								</span>
							</div>
						)}
						{breakdown.outstanding !== undefined && (
							<div className="flex justify-between gap-4 pt-1 border-t">
								<span className="font-medium">Outstanding:</span>
								<span className="font-mono font-medium">
									{formatAmount(breakdown.outstanding, currency)}
								</span>
							</div>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export { formatAmount };
