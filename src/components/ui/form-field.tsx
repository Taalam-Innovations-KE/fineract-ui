import { forwardRef, ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: ReactNode;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
	({ label, required, error, children }, ref) => (
		<div ref={ref} className="space-y-2">
			<Label>
				{label}
				{required && <span className="text-destructive">*</span>}
			</Label>
			{children}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	),
);
FormField.displayName = "FormField";
