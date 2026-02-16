import { Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default async function AuthErrorPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const errorMessages: Record<string, string> = {
		Configuration: "There is a problem with the server configuration.",
		AccessDenied: "You do not have permission to sign in.",
		Verification:
			"The verification token has expired or has already been used.",
		OAuthSignin: "Error in constructing an authorization URL.",
		OAuthCallback: "Error in handling the response from the OAuth provider.",
		OAuthCreateAccount: "Could not create OAuth provider user in the database.",
		EmailCreateAccount: "Could not create email provider user in the database.",
		Callback: "Error in the OAuth callback handler route.",
		OAuthAccountNotLinked: "Email already associated with another account.",
		SessionRequired: "Please sign in to access this page.",
		Default: "An error occurred during authentication.",
	};

	const resolvedSearchParams = await searchParams;
	const error = resolvedSearchParams?.error || "Default";
	const errorMessage = errorMessages[error] || errorMessages.Default;

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold">
						Authentication Error
					</CardTitle>
					<CardDescription>There was a problem signing you in</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Alert variant="destructive">
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
					<div className="flex flex-col gap-2">
						<Button asChild>
							<Link href="/auth/signin">
								<RefreshCw className="w-4 h-4 mr-2" />
								Try again
							</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href="/">
								<Home className="w-4 h-4 mr-2" />
								Go home
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
