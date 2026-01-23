import { X } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function SignOutPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold">Sign Out</CardTitle>
					<CardDescription>Are you sure you want to sign out?</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						action={async () => {
							"use server";
							await signOut({ redirectTo: "/" });
						}}
						className="space-y-4"
					>
						<Button
							type="submit"
							variant="destructive"
							className="w-full"
							size="lg"
						>
							Sign out
						</Button>
						<Button type="button" variant="outline" className="w-full" asChild>
							<a href="/config">
								<X className="w-4 h-4 mr-2" />
								Cancel
							</a>
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
