"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarCheck2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateStringToFormat } from "@/lib/date-utils";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	GetGlClosureResponse,
	OfficeData,
	PostGlClosuresRequest,
	PutGlClosuresRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

type ClosureFormState = {
	officeId: string;
	closingDate: string;
	comments: string;
};

const DEFAULT_FORM: ClosureFormState = {
	officeId: "",
	closingDate: "",
	comments: "",
};

function ClosuresSkeleton() {
	return (
		<div className="space-y-2">
			<Card className="rounded-sm border border-border/60">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border/60 bg-muted/40">
						<tr>
							{Array.from({ length: 5 }).map((_, index) => (
								<th key={`closure-head-${index}`} className="px-3 py-2">
									<Skeleton className="h-4 w-24" />
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{Array.from({ length: 5 }).map((_, rowIndex) => (
							<tr key={`closure-row-${rowIndex}`}>
								{Array.from({ length: 5 }).map((_, cellIndex) => (
									<td
										key={`closure-cell-${rowIndex}-${cellIndex}`}
										className="px-3 py-2"
									>
										<Skeleton className="h-4 w-28" />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</div>
	);
}

async function fetchClosures(
	tenantId: string,
): Promise<GetGlClosureResponse[]> {
	const response = await fetch(BFF_ROUTES.glClosures, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) {
		throw new Error("Failed to fetch accounting closures");
	}
	return response.json();
}

async function fetchOffices(tenantId: string): Promise<OfficeData[]> {
	const response = await fetch(BFF_ROUTES.offices, {
		headers: { "x-tenant-id": tenantId },
	});
	if (!response.ok) {
		throw new Error("Failed to fetch offices");
	}
	return response.json();
}

async function createClosure(tenantId: string, payload: PostGlClosuresRequest) {
	const response = await fetch(BFF_ROUTES.glClosures, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(result?.message || "Failed to create closure");
	}
	return result;
}

async function updateClosure(
	tenantId: string,
	closureId: number,
	payload: PutGlClosuresRequest,
) {
	const response = await fetch(BFF_ROUTES.glClosureById(closureId), {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(payload),
	});
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(result?.message || "Failed to update closure");
	}
	return result;
}

async function deleteClosure(tenantId: string, closureId: number) {
	const response = await fetch(BFF_ROUTES.glClosureById(closureId), {
		method: "DELETE",
		headers: { "x-tenant-id": tenantId },
	});
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(result?.message || "Failed to delete closure");
	}
	return result;
}

function toDateInputValue(value?: string) {
	if (!value) return "";
	if (value.includes("-")) return value.slice(0, 10);
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toISOString().slice(0, 10);
}

export default function AccountingClosuresPage() {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();

	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingClosure, setEditingClosure] =
		useState<GetGlClosureResponse | null>(null);
	const [formState, setFormState] = useState<ClosureFormState>(DEFAULT_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const closuresQuery = useQuery({
		queryKey: ["gl-closures", tenantId],
		queryFn: () => fetchClosures(tenantId),
	});

	const officesQuery = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (payload: PostGlClosuresRequest) =>
			createClosure(tenantId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["gl-closures", tenantId] });
			setIsSheetOpen(false);
			setEditingClosure(null);
			setToastMessage("Closure created successfully");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (payload: PutGlClosuresRequest) =>
			updateClosure(tenantId, editingClosure?.id || 0, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["gl-closures", tenantId] });
			setIsSheetOpen(false);
			setEditingClosure(null);
			setToastMessage("Closure comments updated successfully");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteClosure(tenantId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["gl-closures", tenantId] });
			setToastMessage("Closure deleted successfully");
		},
	});

	useEffect(() => {
		if (!toastMessage) return;
		const timeout = window.setTimeout(() => setToastMessage(null), 3000);
		return () => window.clearTimeout(timeout);
	}, [toastMessage]);

	const offices = officesQuery.data || [];
	const closures = closuresQuery.data || [];

	const latestClosureByOffice = useMemo(() => {
		const map = new Map<number, number>();
		for (const closure of closures) {
			if (!closure.id || !closure.officeId) continue;
			const current = map.get(closure.officeId);
			if (!current || closure.id > current) {
				map.set(closure.officeId, closure.id);
			}
		}
		return map;
	}, [closures]);

	const openCreateSheet = () => {
		setEditingClosure(null);
		setFormError(null);
		setFormState({
			...DEFAULT_FORM,
			officeId: offices[0]?.id ? String(offices[0].id) : "",
		});
		setIsSheetOpen(true);
	};

	const openEditSheet = (closure: GetGlClosureResponse) => {
		setEditingClosure(closure);
		setFormError(null);
		setFormState({
			officeId: closure.officeId ? String(closure.officeId) : "",
			closingDate: toDateInputValue(closure.closingDate),
			comments: closure.comments || "",
		});
		setIsSheetOpen(true);
	};

	const handleDelete = (closure: GetGlClosureResponse) => {
		if (!closure.id || !closure.officeId) return;
		const latestId = latestClosureByOffice.get(closure.officeId);
		if (latestId !== closure.id) {
			setFormError(
				"Only the latest closure for an office can be deleted. Select the latest record.",
			);
			return;
		}
		const confirmed = window.confirm(
			`Delete closure ${closure.id} for ${closure.officeName || "office"}?`,
		);
		if (!confirmed) return;
		deleteMutation.mutate(closure.id);
	};

	const handleSave = () => {
		if (editingClosure) {
			if (!formState.comments.trim()) {
				setFormError("Comments are required when updating a closure");
				return;
			}
			setFormError(null);
			updateMutation.mutate({ comments: formState.comments.trim() });
			return;
		}

		if (!formState.officeId) {
			setFormError("Office is required");
			return;
		}
		if (!formState.closingDate) {
			setFormError("Closing date is required");
			return;
		}

		setFormError(null);
		createMutation.mutate({
			officeId: Number(formState.officeId),
			closingDate: formatDateStringToFormat(
				formState.closingDate,
				"dd MMMM yyyy",
			),
			comments: formState.comments.trim() || undefined,
			dateFormat: "dd MMMM yyyy",
			locale: "en",
		});
	};

	const columns = [
		{
			header: "Closure ID",
			cell: (closure: GetGlClosureResponse) => (
				<span className="font-mono">{closure.id || "—"}</span>
			),
		},
		{
			header: "Office",
			cell: (closure: GetGlClosureResponse) => (
				<span>{closure.officeName || "—"}</span>
			),
		},
		{
			header: "Closing Date",
			cell: (closure: GetGlClosureResponse) => (
				<span>{closure.closingDate || "—"}</span>
			),
		},
		{
			header: "Status",
			cell: (closure: GetGlClosureResponse) => (
				<Badge variant={closure.deleted ? "destructive" : "success"}>
					{closure.deleted ? "Deleted" : "Active"}
				</Badge>
			),
		},
		{
			header: "Actions",
			headerClassName: "text-right",
			className: "text-right",
			cell: (closure: GetGlClosureResponse) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => openEditSheet(closure)}
					>
						Edit
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleDelete(closure)}
						disabled={deleteMutation.isPending}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			),
		},
	];

	const isBusy =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return (
		<>
			<PageShell
				title="Accounting Closures"
				subtitle="Create and manage office closure cut-off dates"
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/config/financial/accounting">
								<ArrowLeft className="h-4 w-4 mr-2" />
								Back to Accounting Setup
							</Link>
						</Button>
						<Button onClick={openCreateSheet}>
							<Plus className="h-4 w-4 mr-2" />
							Create Closure
						</Button>
					</div>
				}
			>
				<Card>
					<CardHeader>
						<CardTitle>Closure Registry</CardTitle>
						<CardDescription>
							{closures.length} closures recorded. Only the latest closure per
							office can be deleted.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<CalendarCheck2 className="h-4 w-4" />
							<AlertTitle>Operational Rule</AlertTitle>
							<AlertDescription>
								Closing dates block posting/reversals before the closure date.
								Update only comments after creation.
							</AlertDescription>
						</Alert>
						{closuresQuery.isLoading || officesQuery.isLoading ? (
							<ClosuresSkeleton />
						) : (
							<DataTable
								data={closures}
								columns={columns}
								getRowId={(closure) => closure.id || "closure-row"}
								emptyMessage="No accounting closures found."
							/>
						)}
					</CardContent>
				</Card>
			</PageShell>

			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{editingClosure
								? "Update Closure Comments"
								: "Create Accounting Closure"}
						</SheetTitle>
						<SheetDescription>
							{editingClosure
								? "Only comments can be edited after a closure is created."
								: "Provide office and closure date to create a posting cut-off."}
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						{formError && (
							<Alert variant="destructive">
								<AlertTitle>Validation Error</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						)}

						{!editingClosure && (
							<>
								<div className="space-y-2">
									<Label>Office</Label>
									<Select
										value={formState.officeId}
										onValueChange={(value) =>
											setFormState((prev) => ({ ...prev, officeId: value }))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select office" />
										</SelectTrigger>
										<SelectContent>
											{offices.map((office) => (
												<SelectItem key={office.id} value={String(office.id)}>
													{office.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="closing-date">Closing Date</Label>
									<Input
										id="closing-date"
										type="date"
										value={formState.closingDate}
										onChange={(event) =>
											setFormState((prev) => ({
												...prev,
												closingDate: event.target.value,
											}))
										}
									/>
								</div>
							</>
						)}

						{editingClosure && (
							<div className="space-y-2 text-sm">
								<div>
									<span className="text-muted-foreground">Office:</span>{" "}
									{editingClosure.officeName}
								</div>
								<div>
									<span className="text-muted-foreground">Closing Date:</span>{" "}
									{editingClosure.closingDate}
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="closure-comments">Comments</Label>
							<Input
								id="closure-comments"
								value={formState.comments}
								onChange={(event) =>
									setFormState((prev) => ({
										...prev,
										comments: event.target.value,
									}))
								}
							/>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setIsSheetOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={isBusy}>
								{editingClosure ? "Save Comments" : "Create Closure"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{toastMessage && (
				<Alert
					variant="success"
					className="fixed bottom-6 right-6 z-50 w-[320px]"
				>
					<AlertTitle>Success</AlertTitle>
					<AlertDescription>{toastMessage}</AlertDescription>
				</Alert>
			)}
		</>
	);
}
