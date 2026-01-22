import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	CreditDebit,
	JournalEntryData,
} from "@/lib/fineract/generated/types.gen";

interface TransactionLinesProps {
	entry: JournalEntryData;
}

function formatCurrency(amount: number | undefined, symbol = "KES") {
	if (amount === undefined || amount === null) return "—";
	return `${symbol} ${amount.toLocaleString()}`;
}

export function TransactionLines({ entry }: TransactionLinesProps) {
	const credits = entry.credits || [];
	const debits = entry.debits || [];

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Debit Entries</CardTitle>
					<CardDescription>
						Accounts debited in this transaction
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{debits.map((debit, index) => (
							<div
								key={index}
								className="flex justify-between items-center p-3 border rounded"
							>
								<div>
									<div className="font-medium">
										{(debit as CreditDebit & { glAccountName?: string })
											.glAccountName || `Account ${debit.glAccountId}`}
									</div>
									<div className="text-sm text-muted-foreground">
										ID: {debit.glAccountId}
									</div>
								</div>
								<div className="text-right">
									<div className="font-semibold">
										{formatCurrency(debit.amount)}
									</div>
									<div className="text-sm text-muted-foreground">Debit</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Credit Entries</CardTitle>
					<CardDescription>
						Accounts credited in this transaction
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{credits.map((credit, index) => (
							<div
								key={index}
								className="flex justify-between items-center p-3 border rounded"
							>
								<div>
									<div className="font-medium">
										{(credit as CreditDebit & { glAccountName?: string })
											.glAccountName || `Account ${credit.glAccountId}`}
									</div>
									<div className="text-sm text-muted-foreground">
										ID: {credit.glAccountId}
									</div>
								</div>
								<div className="text-right">
									<div className="font-semibold">
										{formatCurrency(credit.amount)}
									</div>
									<div className="text-sm text-muted-foreground">Credit</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
