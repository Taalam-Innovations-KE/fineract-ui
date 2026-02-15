"use client";

import { useMutation } from "@tanstack/react-query";
import { Package, Play, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/config/page-shell";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
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
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	BatchRequest,
	BatchResponse,
} from "@/lib/fineract/generated/types.gen";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { useTenantStore } from "@/store/tenant";

async function executeBatch(
	tenantId: string,
	requests: BatchRequest[],
	enclosingTransaction = false,
): Promise<BatchResponse[]> {
	const response = await fetch(
		`${BFF_ROUTES.batches}?enclosingTransaction=${enclosingTransaction}`,
		{
			method: "POST",
			headers: {
				"x-tenant-id": tenantId,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requests),
		},
	);

	if (!response.ok) {
		const error = await response.json().catch(() => null);
		const message =
			typeof error === "object" &&
			error !== null &&
			"message" in error &&
			typeof (error as { message?: unknown }).message === "string"
				? ((error as { message: string }).message ?? "Failed to execute batch")
				: "Failed to execute batch";
		if (typeof error === "object" && error !== null) {
			throw { ...error, message };
		}
		throw { message };
	}

	return response.json();
}

const SAMPLE_REQUESTS: BatchRequest[] = [
	{
		requestId: 1,
		relativeUrl: "v1/clients",
		method: "POST",
		body: JSON.stringify({
			officeId: 1,
			firstname: "John",
			lastname: "Doe",
			dateOfBirth: "1990-01-01",
			genderId: 1,
			clientTypeId: 1,
			clientClassificationId: 1,
		}),
		headers: [{ name: "Content-Type", value: "application/json" }],
	},
	{
		requestId: 2,
		relativeUrl: "v1/clients",
		method: "POST",
		body: JSON.stringify({
			officeId: 1,
			firstname: "Jane",
			lastname: "Smith",
			dateOfBirth: "1985-05-15",
			genderId: 2,
			clientTypeId: 1,
			clientClassificationId: 1,
		}),
		headers: [{ name: "Content-Type", value: "application/json" }],
	},
];

export default function BatchOperationsPage() {
	const { tenantId } = useTenantStore();
	const [batchResults, setBatchResults] = useState<BatchResponse[] | null>(
		null,
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const [batchRequests, setBatchRequests] = useState<BatchRequest[]>([
		{
			requestId: 1,
			relativeUrl: "",
			method: "GET",
			headers: [],
		},
	]);
	const [enclosingTransaction, setEnclosingTransaction] = useState(false);

	const executeMutation = useMutation({
		mutationFn: ({
			requests,
			transaction,
		}: {
			requests: BatchRequest[];
			transaction: boolean;
		}) => executeBatch(tenantId, requests, transaction),
		onSuccess: (results) => {
			setBatchResults(results);
			setSubmitError(null);
			toast.success(
				`Batch executed successfully. ${results.length} requests processed.`,
			);
		},
		onError: (error, variables) => {
			const trackedError = toSubmitActionError(error, {
				action: "executeBatch",
				endpoint: `${BFF_ROUTES.batches}?enclosingTransaction=${variables.transaction}`,
				method: "POST",
				tenantId,
			});
			setSubmitError(trackedError);
		},
	});

	const addRequest = () => {
		const newRequest: BatchRequest = {
			requestId: Math.max(...batchRequests.map((r) => r.requestId || 0)) + 1,
			relativeUrl: "",
			method: "GET",
			headers: [],
		};
		setBatchRequests([...batchRequests, newRequest]);
	};

	const removeRequest = (requestId: number) => {
		setBatchRequests(batchRequests.filter((r) => r.requestId !== requestId));
	};

	const updateRequest = (requestId: number, updates: Partial<BatchRequest>) => {
		setBatchRequests(
			batchRequests.map((r) =>
				r.requestId === requestId ? { ...r, ...updates } : r,
			),
		);
	};

	const handleExecute = () => {
		if (batchRequests.length === 0) return;
		setSubmitError(null);
		executeMutation.mutate({
			requests: batchRequests,
			transaction: enclosingTransaction,
		});
	};

	const loadSample = () => {
		setBatchRequests(SAMPLE_REQUESTS);
	};

	const resultsColumns = [
		{
			header: "Request ID",
			cell: (result: BatchResponse) => result.requestId,
		},
		{
			header: "Status",
			cell: (result: BatchResponse) => (
				<Badge variant={result.statusCode === 200 ? "default" : "destructive"}>
					{result.statusCode}
				</Badge>
			),
		},
		{
			header: "Response",
			cell: (result: BatchResponse) => (
				<div className="max-w-xs truncate text-sm">
					{result.body
						? JSON.stringify(JSON.parse(result.body), null, 2)
						: "No response"}
				</div>
			),
		},
	];

	return (
		<PageShell
			title="Batch Operations"
			subtitle="Execute multiple API requests in a single batch operation"
		>
			<div className="space-y-6">
				<SubmitErrorAlert error={submitError} title="Batch execution failed" />
				{/* Summary */}
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Requests in Batch
								</span>
								<span className="text-2xl font-bold">
									{batchRequests.length}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Transaction Mode
								</span>
								<Badge variant={enclosingTransaction ? "default" : "secondary"}>
									{enclosingTransaction ? "Enabled" : "Disabled"}
								</Badge>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Last Execution
								</span>
								<span className="text-2xl font-bold">
									{batchResults ? `${batchResults.length}` : "-"}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Batch Configuration */}
				<Card>
					<CardHeader>
						<CardTitle>Batch Configuration</CardTitle>
						<CardDescription>
							Configure your batch requests and execution settings
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label>Enclosing Transaction</Label>
								<p className="text-sm text-muted-foreground">
									Execute all requests in a single database transaction
								</p>
							</div>
							<input
								type="checkbox"
								checked={enclosingTransaction}
								onChange={(e) => setEnclosingTransaction(e.target.checked)}
								className="rounded border-gray-300"
							/>
						</div>

						<div className="flex gap-2">
							<Button onClick={addRequest}>
								<Plus className="h-4 w-4 mr-2" />
								Add Request
							</Button>
							<Button onClick={loadSample} variant="outline">
								Load Sample
							</Button>
							<Button
								onClick={handleExecute}
								disabled={
									batchRequests.length === 0 || executeMutation.isPending
								}
							>
								{executeMutation.isPending ? (
									"Executing..."
								) : (
									<>
										<Play className="h-4 w-4 mr-2" />
										Execute Batch
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Requests */}
				<Card>
					<CardHeader>
						<CardTitle>Batch Requests</CardTitle>
						<CardDescription>
							Configure the API requests to execute in this batch
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{batchRequests.map((request, index) => (
								<div
									key={request.requestId}
									className="border rounded-lg p-4 space-y-4"
								>
									<div className="flex items-center justify-between">
										<h4 className="font-medium">
											Request #{request.requestId}
										</h4>
										{batchRequests.length > 1 && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => removeRequest(request.requestId!)}
											>
												Remove
											</Button>
										)}
									</div>

									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div className="space-y-2">
											<Label>HTTP Method</Label>
											<Select
												value={request.method}
												onValueChange={(value) =>
													updateRequest(request.requestId!, { method: value })
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="GET">GET</SelectItem>
													<SelectItem value="POST">POST</SelectItem>
													<SelectItem value="PUT">PUT</SelectItem>
													<SelectItem value="DELETE">DELETE</SelectItem>
												</SelectContent>
											</Select>
										</div>

										<div className="space-y-2 md:col-span-2">
											<Label>Relative URL</Label>
											<Input
												value={request.relativeUrl}
												onChange={(e) =>
													updateRequest(request.requestId!, {
														relativeUrl: e.target.value,
													})
												}
												placeholder="v1/clients"
											/>
										</div>
									</div>

									{(request.method === "POST" || request.method === "PUT") && (
										<div className="space-y-2">
											<Label>Request Body (JSON)</Label>
											<Textarea
												value={request.body || ""}
												onChange={(e) =>
													updateRequest(request.requestId!, {
														body: e.target.value,
													})
												}
												placeholder='{"key": "value"}'
												rows={3}
											/>
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Results */}
				{batchResults && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5" />
								Batch Execution Results
							</CardTitle>
							<CardDescription>
								Results from the batch operation execution
							</CardDescription>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={resultsColumns}
								data={batchResults}
								getRowId={(result: BatchResponse) =>
									result.requestId?.toString() || "result"
								}
								emptyMessage="No results to display."
							/>
						</CardContent>
					</Card>
				)}
			</div>
		</PageShell>
	);
}
