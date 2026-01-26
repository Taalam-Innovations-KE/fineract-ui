"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { OfficeForm } from "@/components/config/forms/office-form";
import { PageShell } from "@/components/config/page-shell";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type {
	OfficeData,
	PostOfficesRequest,
} from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchOffices(tenantId: string): Promise<OfficeData[]> {
	const response = await fetch(BFF_ROUTES.offices, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch offices");
	}

	return response.json();
}

async function createOffice(tenantId: string, data: PostOfficesRequest) {
	const response = await fetch(BFF_ROUTES.offices, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to create office");
	}

	return response.json();
}

async function updateOffice(
	tenantId: string,
	officeId: number,
	data: PostOfficesRequest,
) {
	const response = await fetch(`${BFF_ROUTES.offices}/${officeId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-tenant-id": tenantId,
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to update office");
	}

	return response.json();
}

type OfficeNode = OfficeData & { children: OfficeNode[] };

function buildOfficeTree(offices: OfficeData[]): OfficeNode[] {
	const officeMap = new Map<number, OfficeNode>();

	offices.forEach((office) => {
		officeMap.set(office.id!, { ...office, children: [] });
	});

	const tree: OfficeNode[] = [];

	offices.forEach((office) => {
		const node = officeMap.get(office.id!);
		if (!node) return;

		if (office.parentId) {
			const parent = officeMap.get(office.parentId);
			if (parent) {
				parent.children.push(node);
			} else {
				tree.push(node);
			}
		} else {
			tree.push(node);
		}
	});

	return tree;
}

function flattenOfficeTree(
	tree: OfficeNode[],
	level = 0,
): Array<{ office: OfficeNode; level: number }> {
	return tree.flatMap((office) => [
		{ office, level },
		...flattenOfficeTree(office.children, level + 1),
	]);
}

export default function OfficesPage() {
	const { tenantId } = useTenantStore();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedOffice, setSelectedOffice] = useState<OfficeData | null>(null);
	const queryClient = useQueryClient();

	const isEditing = Boolean(selectedOffice);

	const {
		data: offices = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["offices", tenantId],
		queryFn: () => fetchOffices(tenantId),
	});

	const createMutation = useMutation({
		mutationFn: (data: PostOfficesRequest) => createOffice(tenantId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["offices", tenantId] });
			setIsDialogOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: PostOfficesRequest) =>
			updateOffice(tenantId, selectedOffice!.id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["offices", tenantId] });
			setIsDialogOpen(false);
			setSelectedOffice(null);
		},
	});

	const handleRowClick = (row: { office: OfficeNode; level: number }) => {
		setSelectedOffice(row.office);
		setIsDialogOpen(true);
	};

	const handleCreateNew = () => {
		setSelectedOffice(null);
		setIsDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setIsDialogOpen(open);
		if (!open) {
			setSelectedOffice(null);
		}
	};

	const officeTree = buildOfficeTree(offices);
	const flattenedOffices = flattenOfficeTree(officeTree);
	const officeLookup = new Map(offices.map((office) => [office.id, office]));
	const officeColumns = [
		{
			header: "Office",
			cell: ({ office, level }: { office: OfficeNode; level: number }) => (
				<div className="flex items-center gap-2">
					<div style={{ paddingLeft: `${level * 0.75}rem` }}>
						<span className="font-medium">{office.name}</span>
					</div>
					{!office.parentId && (
						<Badge variant="outline" className="text-xs px-2 py-0.5">
							Head Office
						</Badge>
					)}
				</div>
			),
		},
		{
			header: "Parent",
			cell: ({ office }: { office: OfficeNode; level: number }) => (
				<span className={office.parentId ? "" : "text-muted-foreground"}>
					{office.parentId
						? officeLookup.get(office.parentId)?.name || "—"
						: "—"}
				</span>
			),
		},
		{
			header: "External ID",
			cell: ({ office }: { office: OfficeNode; level: number }) => {
				const externalId =
					typeof office.externalId === "object"
						? office.externalId?.value
						: office.externalId;
				return (
					<span className={externalId ? "" : "text-muted-foreground"}>
						{externalId || "—"}
					</span>
				);
			},
		},
		{
			header: "Type",
			cell: ({ office }: { office: OfficeNode; level: number }) =>
				office.parentId ? (
					<Badge variant="secondary" className="text-xs px-2 py-0.5">
						Branch
					</Badge>
				) : (
					<Badge variant="default" className="text-xs px-2 py-0.5">
						Head
					</Badge>
				),
		},
	];

	return (
		<PageShell
			title="Offices"
			subtitle="Manage your organization's office hierarchy"
			actions={
				<Button onClick={handleCreateNew}>
					<Plus className="h-4 w-4 mr-2" />
					Create Office
				</Button>
			}
		>
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Total Offices
								</span>
								<span className="text-2xl font-bold">{offices.length}</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Head Offices
								</span>
								<span className="text-2xl font-bold">
									{offices.filter((o) => !o.parentId).length}
								</span>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-6">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">
									Branch Offices
								</span>
								<span className="text-2xl font-bold">
									{offices.filter((o) => o.parentId).length}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Offices</CardTitle>
						<CardDescription>
							Hierarchical listing of all offices in your organization
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="text-center py-8 text-muted-foreground">
								Loading offices...
							</div>
						)}
						{error && (
							<div className="text-center py-8 text-destructive">
								Failed to load offices. Please try again.
							</div>
						)}
						{!isLoading && !error && offices.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No offices found. Create your first office to get started.
							</div>
						)}
						{!isLoading && !error && officeTree.length > 0 && (
							<DataTable
								data={flattenedOffices}
								columns={officeColumns}
								getRowId={(row) =>
									row.office.id ?? row.office.name ?? "office-row"
								}
								onRowClick={handleRowClick}
								enableActions={true}
								getViewUrl={(row) =>
									`/config/organisation/offices/${row.office.id}`
								}
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isDialogOpen} onOpenChange={handleDialogClose}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-lg overflow-y-auto"
				>
					<SheetHeader>
						<SheetTitle>
							{isEditing ? "Edit Office" : "Create New Office"}
						</SheetTitle>
						<SheetDescription>
							{isEditing
								? "Update office details"
								: "Add a new office to your organization hierarchy"}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						<OfficeForm
							key={selectedOffice?.id ?? "new"}
							offices={offices.filter((o) => o.id !== selectedOffice?.id)}
							initialData={selectedOffice ?? undefined}
							onSubmit={(data) =>
								isEditing
									? updateMutation.mutateAsync(data)
									: createMutation.mutateAsync(data)
							}
							onCancel={() => handleDialogClose(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</PageShell>
	);
}
