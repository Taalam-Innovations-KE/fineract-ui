import {
	ArrowRight,
	BookOpen,
	CalendarCheck2,
	GitBranch,
	Link2,
} from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/config/page-shell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const modules = [
	{
		title: "Chart of Accounts",
		description:
			"Create and manage hierarchical GL accounts, import templates, and maintain account metadata.",
		href: "/config/financial/accounting/chart-of-accounts",
		icon: GitBranch,
	},
	{
		title: "Accounting Rules",
		description:
			"Define preconfigured debit and credit account combinations for operational journal workflows.",
		href: "/config/financial/accounting/rules",
		icon: BookOpen,
	},
	{
		title: "Financial Activities",
		description:
			"Map financial activities to GL accounts based on mapped account type constraints.",
		href: "/config/financial/accounting/financial-activities",
		icon: Link2,
	},
	{
		title: "Accounting Closures",
		description:
			"Open and manage branch accounting closure records to enforce posting cut-off dates.",
		href: "/config/financial/accounting/closures",
		icon: CalendarCheck2,
	},
] as const;

export default function AccountingSetupPage() {
	return (
		<PageShell
			title="Accounting Setup"
			subtitle="Manage chart of accounts, mappings, and closure controls"
		>
			<div className="grid gap-4 md:grid-cols-2">
				{modules.map((module) => {
					const Icon = module.icon;
					return (
						<Card
							key={module.href}
							className="rounded-sm border border-border/60"
						>
							<CardHeader>
								<div className="flex items-start gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
										<Icon className="h-5 w-5 text-primary" />
									</div>
									<div className="space-y-1">
										<CardTitle>{module.title}</CardTitle>
										<CardDescription>{module.description}</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<Button
									asChild
									variant="outline"
									className="w-full justify-between"
								>
									<Link href={module.href}>
										Open Module
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</PageShell>
	);
}
