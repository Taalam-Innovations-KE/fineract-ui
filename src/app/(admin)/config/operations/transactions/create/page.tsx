"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/config/page-shell";
import { JournalEntryForm } from "@/components/journal-entry-form";
import { Button } from "@/components/ui/button";

export default function CreateJournalEntryPage() {
	return (
		<PageShell
			title="Create Journal Entry"
			subtitle="Add a new manual journal entry"
			actions={
				<Button variant="outline" asChild>
					<Link href="/config/operations/transactions">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Transactions
					</Link>
				</Button>
			}
		>
			<div className="max-w-4xl">
				<JournalEntryForm />
			</div>
		</PageShell>
	);
}
