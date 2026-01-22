"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Eye, XCircle } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/config/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	AuditData,
	RetrieveAuditSearchTemplate1Response,
	RetrieveCommandsResponse,
} from "@/lib/fineract/generated/types.gen";

interface MakerCheckerEntry extends AuditData {
	id?: number;
	actionName?: string;
	entityName?: string;
	resourceId?: number;
	maker?: string;
	madeOnDate?: string;
	checkedOnDate?: string;
	processingResult?: string;
	commandAsJson?: Record<string, unknown>;
}

import { useTenantStore } from "@/store/tenant";

async function fetchMakerCheckers(
	tenantId: string,
	params?: Record<string, string>,
): Promise<MakerCheckerEntry[]> {
	const url = new URL(BFF_ROUTES.makercheckers);
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value) url.searchParams.set(key, value);
		});
	}

	const response = await fetch(url.toString(), {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch maker-checker entries");
	}

	return response.json();
}

async function fetchMakerCheckerTemplate(
	tenantId: string,
): Promise<RetrieveAuditSearchTemplate1Response> {
	const response = await fetch(`${BFF_ROUTES.makercheckers}/searchtemplate`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch maker-checker template");
	}

	return response.json();
}

async function approveMakerCheckerEntry(
	tenantId: string,
	auditId: number,
	command: "approve" | "reject",
) {
	const response = await fetch(
		`${BFF_ROUTES.makercheckers}/${auditId}?command=${command}`,
		{
			method: "POST",
			headers: {
				"x-tenant-id": tenantId,
			},
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || `Failed to ${command} entry`);
	}

	return data;
}

export default function MakerCheckerPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [selectedEntry, setSelectedEntry] = useState<MakerCheckerEntry | null>(
		null,
	);
	const [actionDialogOpen, setActionDialogOpen] = useState(false);
	const [actionType, setActionType] = useState<"approve" | "reject" | null>(
		null,
	);

	// Filter states
	const [actionName, setActionName] = useState("");
	const [entityName, setEntityName] = useState("");
	const [makerId, setMakerId] = useState("");

	const { data: template } = useQuery({
		queryKey: ["maker-checker-template", tenantId],
		queryFn: () => fetchMakerCheckerTemplate(tenantId),
	});

	const {
		data: entries = [],
		isLoading: entriesLoading,
		error: entriesError,
	} = useQuery<MakerCheckerEntry[]>({
		queryKey: ["maker-checkers", tenantId, actionName, entityName, makerId],
		queryFn: () =>
			fetchMakerCheckers(tenantId, {
				actionName: actionName || "",
				entityName: entityName || "",
				makerId: makerId || "",
			}),
	});

	const approveMutation = useMutation({
		mutationFn: ({
			auditId,
			command,
		}: {
			auditId: number;
			command: "approve" | "reject";
		}) => approveMakerCheckerEntry(tenantId, auditId, command),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["maker-checkers"],
			});
			setActionDialogOpen(false);
			setSelectedEntry(null);
			setActionType(null);
		},
	});

	const handleAction = (
		entry: MakerCheckerEntry,
		action: "approve" | "reject",
	) => {
		setSelectedEntry(entry);
		setActionType(action);
		setActionDialogOpen(true);
	};

	const handleConfirmAction = () => {
		if (!selectedEntry || !actionType) return;

		approveMutation.mutate({
			auditId: selectedEntry.id || 0,
			command: actionType,
		});
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleString();
	};

	const getStatusBadge = (entry: MakerCheckerEntry) => {
		const status = entry.processingResult?.toLowerCase();
		if (status === "approved") {
			return (
				<Badge variant="default" className="bg-green-500">
					Approved
				</Badge>
			);
		}
		if (status === "rejected") {
			return <Badge variant="destructive">Rejected</Badge>;
		}
		return <Badge variant="secondary">Pending</Badge>;
	};

	return (
		<PageShell
			title="Maker-Checker Inbox"
			subtitle="Review and approve pending operations requiring maker-checker approval"
		>
			<Card>
				<CardHeader>
					<CardTitle>Pending Approvals</CardTitle>
					<CardDescription>
						Operations that require your approval before they can be processed.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Filters */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="action-filter">Action</Label>
							<Select value={actionName} onValueChange={setActionName}>
								<SelectTrigger id="action-filter">
									<SelectValue placeholder="All actions" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">All actions</SelectItem>
									{template?.actionNames?.map((action) => (
										<SelectItem key={action} value={action}>
											{action}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="entity-filter">Entity</Label>
							<Select value={entityName} onValueChange={setEntityName}>
								<SelectTrigger id="entity-filter">
									<SelectValue placeholder="All entities" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">All entities</SelectItem>
									{template?.entityNames?.map((entity) => (
										<SelectItem key={entity} value={entity}>
											{entity}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="maker-filter">Maker ID</Label>
							<Input
								id="maker-filter"
								placeholder="Filter by maker ID"
								value={makerId}
								onChange={(e) => setMakerId(e.target.value)}
							/>
						</div>
					</div>

					{/* Error State */}
					{entriesError && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Failed to load entries</AlertTitle>
							<AlertDescription>
								Unable to fetch maker-checker entries. Please try again.
							</AlertDescription>
						</Alert>
					)}

					{/* Loading State */}
					{entriesLoading && (
						<div className="py-6 text-center text-muted-foreground">
							Loading pending approvals...
						</div>
					)}

					{/* Entries List */}
					{!entriesLoading && !entriesError && (
						<div className="space-y-3">
							{entries.length === 0 ? (
								<div className="py-6 text-center text-muted-foreground">
									No pending approvals found.
								</div>
							) : (
								entries.map((entry) => (
									<div
										key={entry.id}
										className="rounded-lg border p-4 space-y-3"
									>
										<div className="flex items-start justify-between">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<h3 className="font-semibold">
														{entry.actionName || "Unknown Action"}
													</h3>
													{getStatusBadge(entry)}
												</div>
												<p className="text-sm text-muted-foreground">
													{entry.entityName || "Unknown Entity"}
												</p>
												<p className="text-xs text-muted-foreground">
													Maker: {entry.maker || "Unknown"} • Made on:{" "}
													{formatDate(entry.madeOnDate)}
												</p>
											</div>

											<div className="flex items-center gap-2">
												{entry.processingResult === null && (
													<>
														{entry.processingResult === null && (
															<>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => handleAction(entry, "approve")}
																	disabled={approveMutation.isPending}
																>
																	<CheckCircle className="mr-2 h-4 w-4" />
																	Approve
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => handleAction(entry, "reject")}
																	disabled={approveMutation.isPending}
																>
																	<XCircle className="mr-2 h-4 w-4" />
																	Reject
																</Button>
															</>
														)}
													</>
												)}
												<Button
													size="sm"
													variant="outline"
													onClick={() => setSelectedEntry(entry)}
												>
													<Eye className="mr-2 h-4 w-4" />
													View Details
												</Button>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Action Confirmation Dialog */}
			<Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{actionType === "approve"
								? "Approve"
								: actionType === "reject"
									? "Reject"
									: "Delete"}{" "}
							Entry
						</DialogTitle>
						<DialogDescription>
							{selectedEntry && (
								<>
									Are you sure you want to {actionType} this{" "}
									{selectedEntry.actionName} operation on{" "}
									{selectedEntry.entityName}?
									{actionType === "reject" && " This action cannot be undone."}
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setActionDialogOpen(false)}
							disabled={approveMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant={actionType === "reject" ? "destructive" : "default"}
							onClick={handleConfirmAction}
							disabled={approveMutation.isPending}
						>
							{approveMutation.isPending
								? "Processing..."
								: actionType === "approve"
									? "Approve"
									: "Reject"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Details Dialog */}
			<Dialog
				open={!!selectedEntry && !actionDialogOpen}
				onOpenChange={() => setSelectedEntry(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Entry Details</DialogTitle>
						<DialogDescription>
							Complete information about this maker-checker entry.
						</DialogDescription>
					</DialogHeader>
					{selectedEntry && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label className="text-sm font-medium">Action</Label>
									<p className="text-sm">{selectedEntry.actionName || "N/A"}</p>
								</div>
								<div>
									<Label className="text-sm font-medium">Entity</Label>
									<p className="text-sm">{selectedEntry.entityName || "N/A"}</p>
								</div>
								<div>
									<Label className="text-sm font-medium">Maker</Label>
									<p className="text-sm">{selectedEntry.maker || "N/A"}</p>
								</div>
								<div>
									<Label className="text-sm font-medium">Status</Label>
									<div className="mt-1">{getStatusBadge(selectedEntry)}</div>
								</div>
								<div>
									<Label className="text-sm font-medium">Made On</Label>
									<p className="text-sm">
										{formatDate(selectedEntry.madeOnDate)}
									</p>
								</div>
								<div>
									<Label className="text-sm font-medium">Processed On</Label>
									<p className="text-sm">
										{formatDate(selectedEntry.checkedOnDate)}
									</p>
								</div>
							</div>
							{selectedEntry.resourceId && (
								<div>
									<Label className="text-sm font-medium">Resource ID</Label>
									<p className="text-sm">{selectedEntry.resourceId}</p>
								</div>
							)}
							{selectedEntry.processingResult && (
								<div>
									<Label className="text-sm font-medium">
										Processing Result
									</Label>
									<p className="text-sm">{selectedEntry.processingResult}</p>
								</div>
							)}
							{selectedEntry.commandAsJson && (
								<div>
									<Label className="text-sm font-medium">Command JSON</Label>
									<pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
										{JSON.stringify(selectedEntry.commandAsJson, null, 2)}
									</pre>
								</div>
							)}
						</div>
					)}
					<DialogFooter>
						<Button onClick={() => setSelectedEntry(null)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
