"use client";

import { Badge } from "@/components/ui/badge";
import type { GetLoansLoanIdStatus } from "@/lib/fineract/generated/types.gen";

interface StatusChipProps {
	status: GetLoansLoanIdStatus | undefined;
	className?: string;
}

function getStatusDisplay(status: GetLoansLoanIdStatus | undefined): {
	label: string;
	variant: "default" | "secondary" | "destructive" | "outline";
	className: string;
} {
	if (!status) {
		return { label: "Unknown", variant: "outline", className: "" };
	}

	if (status.pendingApproval) {
		return {
			label: "Pending Approval",
			variant: "secondary",
			className: "bg-yellow-100 text-yellow-800 border-yellow-300",
		};
	}

	if (status.waitingForDisbursal) {
		return {
			label: "Approved",
			variant: "secondary",
			className: "bg-blue-100 text-blue-800 border-blue-300",
		};
	}

	if (status.active) {
		return {
			label: "Active",
			variant: "default",
			className: "bg-green-100 text-green-800 border-green-300",
		};
	}

	if (status.overpaid) {
		return {
			label: "Overpaid",
			variant: "secondary",
			className: "bg-purple-100 text-purple-800 border-purple-300",
		};
	}

	if (status.closedObligationsMet) {
		return {
			label: "Closed",
			variant: "outline",
			className: "bg-gray-100 text-gray-700 border-gray-300",
		};
	}

	if (status.closedWrittenOff) {
		return {
			label: "Written Off",
			variant: "destructive",
			className: "bg-red-100 text-red-800 border-red-300",
		};
	}

	if (status.closedRescheduled) {
		return {
			label: "Rescheduled",
			variant: "outline",
			className: "bg-orange-100 text-orange-800 border-orange-300",
		};
	}

	if (status.closed) {
		return {
			label: "Closed",
			variant: "outline",
			className: "bg-gray-100 text-gray-700 border-gray-300",
		};
	}

	return {
		label: status.code || "Unknown",
		variant: "outline",
		className: "",
	};
}

export function StatusChip({ status, className }: StatusChipProps) {
	const {
		label,
		variant,
		className: statusClassName,
	} = getStatusDisplay(status);

	return (
		<Badge
			variant={variant}
			className={`font-medium ${statusClassName} ${className || ""}`}
		>
			{label}
		</Badge>
	);
}
