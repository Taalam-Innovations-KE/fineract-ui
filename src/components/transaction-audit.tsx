import { Calendar, History } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";

interface TransactionAuditProps {
	entry: JournalEntryData;
}

function formatDate(dateStr: string) {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day}/${month}/${year}`;
}

export function TransactionAudit({ entry }: TransactionAuditProps) {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
					<CardDescription>Transaction history and changes</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Created Date
							</div>
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>{formatDate(entry.submittedOnDate || "")}</span>
							</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Created By
							</div>
							<div className="text-lg">{entry.createdByUserName || "—"}</div>
						</div>
						{entry.reversed && (
							<div>
								<div className="text-sm font-medium text-muted-foreground">
									Reversed Date
								</div>
								<div className="flex items-center gap-2">
									<History className="h-4 w-4" />
									<span>{formatDate(entry.transactionDate || "")}</span>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
