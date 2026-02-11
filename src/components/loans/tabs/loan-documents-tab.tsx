"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, File, FileText, Image, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { SubmitErrorAlert } from "@/components/errors/SubmitErrorAlert";
import { UploadDocumentDialog } from "@/components/loans/dialogs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { BFF_ROUTES } from "@/lib/fineract/endpoints";
import type { SubmitActionError } from "@/lib/fineract/submit-error";
import { toSubmitActionError } from "@/lib/fineract/submit-error";
import { deleteDocument, downloadDocument } from "@/lib/fineract/upload";
import type { DocumentResponse } from "@/lib/schemas/loan-metadata";
import { useTenantStore } from "@/store/tenant";

interface LoanDocumentsTabProps {
	loanId: number;
}

function formatFileSize(bytes: number | undefined): string {
	if (!bytes) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string | undefined) {
	if (!type) return File;
	const lowerType = type.toLowerCase();
	if (
		lowerType.includes("image") ||
		lowerType.includes("jpg") ||
		lowerType.includes("png")
	) {
		return Image;
	}
	if (
		lowerType.includes("pdf") ||
		lowerType.includes("doc") ||
		lowerType.includes("text")
	) {
		return FileText;
	}
	return File;
}

export function LoanDocumentsTab({ loanId }: LoanDocumentsTabProps) {
	const { tenantId } = useTenantStore();
	const queryClient = useQueryClient();
	const [showUploadDialog, setShowUploadDialog] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<DocumentResponse | null>(
		null,
	);
	const [submitError, setSubmitError] = useState<SubmitActionError | null>(
		null,
	);

	const documentsQuery = useQuery({
		queryKey: ["loanDocuments", loanId, tenantId],
		queryFn: async () => {
			const response = await fetch(BFF_ROUTES.loanDocuments(loanId), {
				headers: { "fineract-platform-tenantid": tenantId },
			});
			if (!response.ok) throw new Error("Failed to fetch documents");
			return response.json() as Promise<DocumentResponse[]>;
		},
		enabled: !!loanId,
	});

	const deleteMutation = useMutation({
		mutationFn: async (documentId: number) => {
			await deleteDocument(loanId, documentId, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["loanDocuments", loanId, tenantId],
			});
			setSubmitError(null);
			setDeleteTarget(null);
		},
		onError: (error, documentId) => {
			setSubmitError(
				toSubmitActionError(error, {
					action: "deleteLoanDocument",
					endpoint: `${BFF_ROUTES.loanDocuments(loanId)}/${documentId}`,
					method: "DELETE",
					tenantId,
				}),
			);
		},
	});

	const handleUploadSuccess = () => {
		queryClient.invalidateQueries({
			queryKey: ["loanDocuments", loanId, tenantId],
		});
	};

	const handleDownload = async (doc: DocumentResponse) => {
		if (!doc.id) return;

		try {
			const blob = await downloadDocument(loanId, doc.id, tenantId);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = doc.fileName || doc.name || "document";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download failed:", error);
		}
	};

	if (documentsQuery.isLoading) {
		return <LoanDocumentsTabSkeleton />;
	}

	const documents = documentsQuery.data || [];

	if (documents.length === 0) {
		return (
			<>
				<SubmitErrorAlert error={submitError} title="Document action failed" />
				<Card>
					<CardContent className="py-8 text-center">
						<FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
						<p className="text-lg font-medium text-muted-foreground mb-2">
							No Documents Attached
						</p>
						<p className="text-sm text-muted-foreground mb-4">
							Upload documents to attach to this loan application.
						</p>
						<Button onClick={() => setShowUploadDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Upload Document
						</Button>
					</CardContent>
				</Card>
				<UploadDocumentDialog
					open={showUploadDialog}
					onOpenChange={setShowUploadDialog}
					loanId={loanId}
					onSuccess={handleUploadSuccess}
				/>
			</>
		);
	}

	return (
		<>
			<div className="space-y-4">
				<SubmitErrorAlert error={submitError} title="Document action failed" />
				{/* Header with Upload button */}
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
						attached
					</p>
					<Button size="sm" onClick={() => setShowUploadDialog(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Upload Document
					</Button>
				</div>

				{/* Documents Table */}
				<Card className="overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead>Document</TableHead>
								<TableHead>File Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead className="text-right">Size</TableHead>
								<TableHead className="w-24">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{documents.map((doc, index) => {
								const IconComponent = getFileIcon(doc.type);

								return (
									<TableRow key={doc.id || index}>
										<TableCell>
											<div className="flex items-center gap-2">
												<IconComponent className="h-4 w-4 text-muted-foreground" />
												<div>
													<p className="font-medium">
														{doc.name || "Untitled"}
													</p>
													{doc.description && (
														<p className="text-xs text-muted-foreground">
															{doc.description}
														</p>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{doc.fileName || "—"}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{doc.type || "—"}
										</TableCell>
										<TableCell className="text-right text-sm">
											{formatFileSize(doc.size)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												{doc.id && (
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDownload(doc)}
													>
														<Download className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setDeleteTarget(doc)}
													className="text-destructive hover:text-destructive"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			</div>

			{/* Upload Dialog */}
			<UploadDocumentDialog
				open={showUploadDialog}
				onOpenChange={setShowUploadDialog}
				loanId={loanId}
				onSuccess={handleUploadSuccess}
			/>

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Document</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{" "}
							<strong>{deleteTarget?.name || "this document"}</strong>? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!deleteTarget?.id) return;
								setSubmitError(null);
								deleteMutation.mutate(deleteTarget.id);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete Document"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function LoanDocumentsTabSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-9 w-36" />
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							{[1, 2, 3, 4, 5].map((i) => (
								<TableHead key={i}>
									<Skeleton className="h-4 w-20" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{[1, 2, 3].map((row) => (
							<TableRow key={row}>
								{[1, 2, 3, 4, 5].map((cell) => (
									<TableCell key={cell}>
										<Skeleton className="h-4 w-24" />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
