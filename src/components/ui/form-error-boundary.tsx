import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

interface FormErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error: Error }>;
}

class FormErrorBoundary extends React.Component<
	FormErrorBoundaryProps,
	FormErrorBoundaryState
> {
	constructor(props: FormErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Form Error Boundary caught an error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			const Fallback = this.props.fallback || DefaultFallback;
			return <Fallback error={this.state.error!} />;
		}

		return this.props.children;
	}
}

function DefaultFallback({ error }: { error: Error }) {
	return (
		<Alert variant="destructive" className="m-4">
			<AlertTitle>Form Error</AlertTitle>
			<AlertDescription>
				{error.message}
				<br />
				<small className="text-muted-foreground">
					Please refresh the page and try again. If the problem persists,
					contact support.
				</small>
			</AlertDescription>
		</Alert>
	);
}

export { FormErrorBoundary };
