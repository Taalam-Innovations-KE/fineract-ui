"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

import type { MakerCheckerEntry } from "@/lib/fineract/maker-checker";
import { approveRejectEntry, getInbox } from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function InboxPage() {
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState<number | null>(null);
	const { inbox, setInbox } = useMakerCheckerStore();

	useEffect(() => {
		async function loadInbox() {
			try {
				const items = await getInbox();
				setInbox(items);
			} catch (error) {
				console.error("Failed to load inbox:", error);
			} finally {
				setLoading(false);
			}
		}
		loadInbox();
	}, [setInbox]);

	const handleAction = async (
		auditId: number,
		command: "approve" | "reject",
	) => {
		setProcessing(auditId);
		try {
			await approveRejectEntry(auditId, command);
			// Remove from inbox
			setInbox(inbox.filter((item) => item.auditId !== auditId));
			console.log(`Entry ${auditId} ${command}d.`);
		} catch (error) {
			console.error(`Failed to ${command} entry:`, error);
		} finally {
			setProcessing(null);
		}
	};

	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Maker Checker Inbox</h1>
				<p className="text-muted-foreground">
					Review and approve pending operations.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Pending Approvals</CardTitle>
					<CardDescription>
						Items requiring your approval before execution.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{inbox.length === 0 ? (
						<p className="text-muted-foreground">No pending approvals.</p>
					) : (
						<div className="space-y-4">
							{inbox.map((item: MakerCheckerEntry) => (
								<div key={item.auditId} className="border rounded p-4">
									<div className="flex justify-between items-start">
										<div>
											<p>
												<strong>ID:</strong> {item.auditId}
											</p>
											<p>
												<strong>Maker:</strong> {item.makerId}
											</p>
											<p>
												<strong>Entity:</strong>{" "}
												<Badge variant="outline">{item.entityName}</Badge>
											</p>
											<p>
												<strong>Date:</strong>{" "}
												{new Date(item.madeOnDate).toLocaleDateString()}
											</p>
											<p>
												<strong>Status:</strong> {item.processingResult}
											</p>
										</div>
										<div className="flex space-x-2">
											<Button
												size="sm"
												onClick={() => handleAction(item.auditId, "approve")}
												disabled={processing === item.auditId}
											>
												Approve
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onClick={() => handleAction(item.auditId, "reject")}
												disabled={processing === item.auditId}
											>
												Reject
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
