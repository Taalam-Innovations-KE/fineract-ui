import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";
import { useTransactionStore } from "@/store/transactions";

interface TransactionOverviewProps {
	entry: JournalEntryData;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day}/${month}/${year}`;
}

export function TransactionOverview({ entry }: TransactionOverviewProps) {
	const { getStatus } = useTransactionStore();
	const approvalStatus = getStatus(entry.transactionId || "");

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Basic Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Transaction ID
							</div>
							<div className="text-lg font-semibold">{entry.transactionId}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Date
							</div>
							<div className="text-lg">
								{formatDate(entry.transactionDate || "")}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Office
							</div>
							<div className="text-lg">{entry.officeName}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Amount
							</div>
							<div className="text-lg font-semibold">
								{formatCurrency(entry.amount)}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Type
							</div>
							<div className="text-lg">
								{entry.manualEntry ? "Manual" : "System"}
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Status
							</div>
							<div className="flex items-center gap-2">
								{entry.reversed ? (
									<Badge variant="destructive">Reversed</Badge>
								) : approvalStatus === "approved" ? (
									<Badge variant="success">Approved</Badge>
								) : approvalStatus === "rejected" ? (
									<Badge variant="destructive">Rejected</Badge>
								) : (
									<Badge variant="secondary">Pending</Badge>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
