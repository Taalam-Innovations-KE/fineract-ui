import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { JournalEntryData } from "@/lib/fineract/generated/types.gen";

interface TransactionDetailsProps {
	entry: JournalEntryData;
}

export function TransactionDetails({ entry }: TransactionDetailsProps) {
	const details = entry.transactionDetails;
	const paymentDetails = details?.paymentDetails;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Transaction Details</CardTitle>
					<CardDescription>
						Additional information and payment details
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Entity Type
							</div>
							<div className="text-lg">{entry.entityType?.value || "—"}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Entity ID
							</div>
							<div className="text-lg">{entry.entityId || "—"}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Entry Type
							</div>
							<div className="text-lg">{entry.entryType?.value || "—"}</div>
						</div>
						<div>
							<div className="text-sm font-medium text-muted-foreground">
								Reference Number
							</div>
							<div className="text-lg">{entry.referenceNumber || "—"}</div>
						</div>
						{paymentDetails && (
							<>
								<div>
									<div className="text-sm font-medium text-muted-foreground">
										Account Number
									</div>
									<div className="text-lg">
										{paymentDetails.accountNumber || "—"}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium text-muted-foreground">
										Bank Number
									</div>
									<div className="text-lg">
										{paymentDetails.bankNumber || "—"}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium text-muted-foreground">
										Check Number
									</div>
									<div className="text-lg">
										{paymentDetails.checkNumber || "—"}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium text-muted-foreground">
										Routing Code
									</div>
									<div className="text-lg">
										{paymentDetails.routingCode || "—"}
									</div>
								</div>
								<div>
									<div className="text-sm font-medium text-muted-foreground">
										Receipt Number
									</div>
									<div className="text-lg">
										{paymentDetails.receiptNumber || "—"}
									</div>
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
