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
import { Skeleton } from "@/components/ui/skeleton";

import type { MakerCheckerEntry } from "@/lib/fineract/maker-checker";
import { useMakerCheckerStore } from "@/store/maker-checker";

export default function InboxPage() {
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState<number | null>(null);
	const { inbox, setInbox } = useMakerCheckerStore();

	useEffect(() => {
		async function loadInbox() {
			try {
				// TODO: Get current user ID from authentication context
				const userId = undefined; // Placeholder
				const response = await fetch(
					`/api/maker-checker/inbox${userId ? `?userId=${userId}` : ""}`,
				);
				const items = await response.json();
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
			// TODO: Add permission validation via API
			const response = await fetch("/api/maker-checker/inbox", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ auditId, command }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				alert(errorData.error || "Failed to approve/reject entry");
				return;
			}

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
		return (
			<div className="space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-72" />
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-52" />
						<Skeleton className="h-4 w-[28rem]" />
					</CardHeader>
					<CardContent className="space-y-4">
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								key={`inbox-entry-skeleton-${index}`}
								className="space-y-3 rounded-lg border p-4"
							>
								<div className="flex items-center justify-between">
									<div className="space-y-2">
										<Skeleton className="h-5 w-36" />
										<Skeleton className="h-4 w-48" />
									</div>
									<Skeleton className="h-4 w-24" />
								</div>
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-56" />
									<div className="flex gap-2">
										<Skeleton className="h-8 w-20" />
										<Skeleton className="h-8 w-20" />
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		);
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
					<CardTitle>Pending Approvals ({inbox.length})</CardTitle>
					<CardDescription>
						Operations awaiting your approval. Only items you have permission to
						check are shown.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{inbox.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">
								No pending approvals requiring your attention.
							</p>
							<p className="text-sm text-muted-foreground mt-2">
								Items will appear here when operations you can approve are
								submitted.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{inbox.map((item: MakerCheckerEntry) => {
								const getStatusColor = (status: string) => {
									switch (status.toLowerCase()) {
										case "awaiting.approval":
											return "secondary";
										case "approved":
											return "default";
										case "rejected":
											return "destructive";
										default:
											return "outline";
									}
								};

								return (
									<div
										key={item.auditId}
										className="border rounded-lg p-4 bg-card"
									>
										<div className="flex justify-between items-start mb-3">
											<div className="flex items-center space-x-4">
												<div>
													<h3 className="font-medium">Entry #{item.auditId}</h3>
													<p className="text-sm text-muted-foreground">
														{item.entityName} • Maker: {item.makerId}
													</p>
												</div>
												<Badge variant={getStatusColor(item.processingResult)}>
													{item.processingResult}
												</Badge>
											</div>
											<div className="text-right text-sm text-muted-foreground">
												{new Date(item.madeOnDate).toLocaleDateString()}
											</div>
										</div>

										<div className="flex justify-between items-center">
											<div className="text-sm">
												<strong>Resource:</strong> {item.resourceId}
												{item.commandAsJson && (
													<>
														<br />
														<strong>Action:</strong>{" "}
														<code className="text-xs bg-muted px-1 py-0.5 rounded">
															{JSON.parse(item.commandAsJson).actionName ||
																"Unknown"}
														</code>
													</>
												)}
											</div>
											<div className="flex space-x-2">
												<Button
													size="sm"
													variant="default"
													onClick={() => handleAction(item.auditId, "approve")}
													disabled={processing === item.auditId}
												>
													{processing === item.auditId
														? "Processing..."
														: "Approve"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleAction(item.auditId, "reject")}
													disabled={processing === item.auditId}
												>
													Reject
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
