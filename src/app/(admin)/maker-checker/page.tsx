import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function MakerCheckerPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Maker Checker Configuration</h1>
				<p className="text-muted-foreground">
					Configure maker checker settings for operations and manage approvals.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Global Settings</CardTitle>
						<CardDescription>
							Enable or disable maker checker system-wide.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link
							href="/admin/maker-checker/global"
							className="text-blue-600 hover:underline"
						>
							Configure Global Settings
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Operation Permissions</CardTitle>
						<CardDescription>
							Configure which operations require maker checker approval.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link
							href="/admin/maker-checker/tasks"
							className="text-blue-600 hover:underline"
						>
							Configure Tasks
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Approval Inbox</CardTitle>
						<CardDescription>
							View and manage pending maker checker approvals.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link
							href="/admin/maker-checker/inbox"
							className="text-blue-600 hover:underline"
						>
							View Inbox
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
