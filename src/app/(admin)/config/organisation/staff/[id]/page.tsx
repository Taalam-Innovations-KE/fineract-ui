"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import { use, useState } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { Staff } from "@/lib/fineract/generated/types.gen";
import { useTenantStore } from "@/store/tenant";

async function fetchStaffMember(tenantId: string, id: string): Promise<Staff> {
	const response = await fetch(`${BFF_ROUTES.staff}/${id}`, {
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch staff member");
	}

	return response.json();
}

async function deleteStaffMember(
	tenantId: string,
	staffId: number,
): Promise<void> {
	const response = await fetch(`${BFF_ROUTES.staff}/${staffId}`, {
		method: "DELETE",
		headers: {
			"x-tenant-id": tenantId,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to delete staff member");
	}
}

export default function StaffDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const { tenantId } = useTenantStore();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const {
		data: staff,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["staffMember", tenantId, id],
		queryFn: () => fetchStaffMember(tenantId, id),
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteStaffMember(tenantId, Number(id)),
		onSuccess: () => {
			window.location.href = "/config/organisation/staff";
		},
	});

	const handleDeleteConfirm = () => {
		deleteMutation.mutate();
	};

	if (isLoading) {
		return (
			<PageShell title="Staff Details">
				<div className="py-6 text-center text-muted-foreground">
					Loading staff details...
				</div>
			</PageShell>
		);
	}

	if (error || !staff) {
		return (
			<PageShell title="Staff Details">
				<div className="py-6 text-center text-destructive">
					Failed to load staff details. Please try again.
				</div>
			</PageShell>
		);
	}

	return (
		<>
			<PageShell
				title={`Staff: ${staff.displayName}`}
				subtitle="View staff details"
				actions={
					<Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
						<Trash className="mr-1 h-4 w-4" />
						Delete
					</Button>
				}
			>
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Staff Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium">Display Name</label>
									<p className="text-lg font-semibold">{staff.displayName}</p>
								</div>
								<div>
									<label className="text-sm font-medium">First Name</label>
									<p>{staff.firstname || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Last Name</label>
									<p>{staff.lastname || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Office</label>
									<p>{staff.officeName || "—"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Is Loan Officer</label>
									<p>{staff.isLoanOfficer ? "Yes" : "No"}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Is Active</label>
									<p>
										{staff.isActive ? (
											<Badge variant="success">Active</Badge>
										) : (
											<Badge variant="secondary">Inactive</Badge>
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{/* Delete Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Staff Member</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{staff.displayName}"? This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end space-x-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
