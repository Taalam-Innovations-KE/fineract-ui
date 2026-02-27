"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface ActionSubmitButtonProps
	extends Omit<ComponentProps<typeof Button>, "type"> {
	pendingLabel?: string;
}

export function ActionSubmitButton({
	pendingLabel = "Saving...",
	children,
	disabled,
	...props
}: ActionSubmitButtonProps) {
	const { pending } = useFormStatus();

	return (
		<Button type="submit" disabled={disabled || pending} {...props}>
			{pending ? pendingLabel : children}
		</Button>
	);
}
