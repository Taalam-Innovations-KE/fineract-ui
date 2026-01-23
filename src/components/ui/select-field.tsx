import { ControllerRenderProps, FieldValues } from "react-hook-form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FormField } from "./form-field";

interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues> {
	label: string;
	required?: boolean;
	error?: string;
	placeholder?: string;
	disabled?: boolean;
	options: Array<{ id?: number; name?: string; value?: string }>;
	field: ControllerRenderProps<TFieldValues, string>;
}

export function SelectField({
	label,
	required,
	error,
	placeholder = "Select...",
	disabled,
	options,
	field,
}: SelectFieldProps) {
	return (
		<FormField label={label} required={required} error={error}>
			<Select
				value={
					field.value !== undefined && field.value !== null
						? String(field.value)
						: undefined
				}
				onValueChange={(value) => field.onChange(Number(value))}
				disabled={disabled}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options
						.filter((option) => option.id !== undefined)
						.map((option) => (
							<SelectItem key={option.id} value={String(option.id)}>
								{option.name || option.value || "Unnamed"}
							</SelectItem>
						))}
				</SelectContent>
			</Select>
		</FormField>
	);
}
