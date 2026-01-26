"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { File, FileText, Image, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { uploadDocument } from "@/lib/fineract/upload";
import type { DocumentUploadInput } from "@/lib/schemas/loan-metadata";
import { documentUploadSchema } from "@/lib/schemas/loan-metadata";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

interface UploadDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loanId: number;
	onSuccess: () => void;
}

function formatFileSize(bytes: number): string {
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
		lowerType.includes("png") ||
		lowerType.includes("jpeg") ||
		lowerType.includes("gif")
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

export function UploadDocumentDialog({
	open,
	onOpenChange,
	loanId,
	onSuccess,
}: UploadDocumentDialogProps) {
	const { tenantId } = useTenantStore();
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const form = useForm<DocumentUploadInput>({
		resolver: zodResolver(documentUploadSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				const file = acceptedFiles[0];
				setSelectedFile(file);
				form.setValue("file", file);
				form.setValue("name", file.name.replace(/\.[^/.]+$/, "")); // Set name from filename

				// Create preview for images
				if (file.type.startsWith("image/")) {
					const url = URL.createObjectURL(file);
					setPreviewUrl(url);
				} else {
					setPreviewUrl(null);
				}

				setUploadError(null);
			}
		},
		[form],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		maxFiles: 1,
		maxSize: 10 * 1024 * 1024, // 10MB
		accept: {
			"image/*": [".png", ".jpg", ".jpeg", ".gif"],
			"application/pdf": [".pdf"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				[".docx"],
			"application/vnd.ms-excel": [".xls"],
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
				".xlsx",
			],
			"text/plain": [".txt"],
		},
	});

	const removeFile = () => {
		setSelectedFile(null);
		setPreviewUrl(null);
		form.setValue("file", undefined as unknown as File);
		form.setValue("name", "");
	};

	const handleSubmit = async (data: DocumentUploadInput) => {
		if (!selectedFile) {
			setUploadError("Please select a file");
			return;
		}

		setIsUploading(true);
		setUploadError(null);
		setUploadProgress(10);

		try {
			setUploadProgress(30);
			await uploadDocument({
				loanId,
				file: selectedFile,
				name: data.name,
				description: data.description,
				tenantId,
			});

			setUploadProgress(100);

			// Cleanup
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}

			onSuccess();
			onOpenChange(false);

			// Reset form
			form.reset();
			setSelectedFile(null);
			setPreviewUrl(null);
			setUploadProgress(0);
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : "Upload failed");
			setUploadProgress(0);
		} finally {
			setIsUploading(false);
		}
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			// Cleanup on close
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			form.reset();
			setSelectedFile(null);
			setPreviewUrl(null);
			setUploadError(null);
			setUploadProgress(0);
		}
		onOpenChange(open);
	};

	const IconComponent = selectedFile
		? getFileIcon(selectedFile.type)
		: FileText;

	return (
		<Sheet open={open} onOpenChange={handleClose}>
			<SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Upload Document</SheetTitle>
					<SheetDescription>
						Upload a document to attach to this loan
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4"
					>
						{/* Dropzone */}
						{!selectedFile ? (
							<div
								{...getRootProps()}
								className={cn(
									"border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
									isDragActive
										? "border-primary bg-primary/5"
										: "border-muted-foreground/25 hover:border-primary/50",
								)}
							>
								<input {...getInputProps()} />
								<Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
								{isDragActive ? (
									<p className="text-primary font-medium">Drop the file here</p>
								) : (
									<>
										<p className="font-medium mb-1">
											Drag and drop a file here, or click to select
										</p>
										<p className="text-sm text-muted-foreground">
											PDF, Word, Excel, Images up to 10MB
										</p>
									</>
								)}
							</div>
						) : (
							<div className="border rounded-lg p-4">
								<div className="flex items-start gap-3">
									{previewUrl ? (
										// biome-ignore lint/performance/noImgElement: blob URL preview requires native img element
										<img
											src={previewUrl}
											alt="Preview"
											className="h-16 w-16 object-cover rounded"
										/>
									) : (
										<div className="h-16 w-16 flex items-center justify-center bg-muted rounded">
											<IconComponent className="h-8 w-8 text-muted-foreground" />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p className="font-medium truncate">{selectedFile.name}</p>
										<p className="text-sm text-muted-foreground">
											{formatFileSize(selectedFile.size)}
										</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={removeFile}
										disabled={isUploading}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Document Name <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input {...field} placeholder="Enter document name" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											placeholder="Optional description"
											rows={2}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{isUploading && (
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span>Uploading...</span>
									<span>{uploadProgress}%</span>
								</div>
								<Progress value={uploadProgress} />
							</div>
						)}

						{uploadError && (
							<Alert variant="destructive">
								<AlertTitle>Upload Failed</AlertTitle>
								<AlertDescription>{uploadError}</AlertDescription>
							</Alert>
						)}

						<SheetFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleClose(false)}
								disabled={isUploading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isUploading || !selectedFile}>
								{isUploading ? "Uploading..." : "Upload Document"}
							</Button>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
