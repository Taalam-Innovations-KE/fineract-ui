import {
	Building2,
	Clock,
	CreditCard,
	DollarSign,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/config/page-shell";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const configModules = [
	{
		title: "Organisation",
		description:
			"Manage offices, staff, users, roles, and operational calendar",
		icon: Building2,
		href: "/config/organisation/offices",
		items: [
			"Offices",
			"Staff",
			"Users",
			"Roles & Permissions",
			"Working Days",
			"Holidays",
			"Business Date",
			"Delinquency Buckets",
		],
	},
	{
		title: "Financial Setup",
		description: "Configure currencies and accounting",
		icon: DollarSign,
		href: "/config/financial/accounting",
		items: [
			"Currencies",
			"Accounting Setup",
			"Chart of Accounts",
			"Payment Types",
		],
	},
	{
		title: "System Configuration",
		description: "Manage codes, global settings, and automated processes",
		icon: Settings,
		href: "/config/system/codes",
		items: ["Code Registry", "Global Configuration", "Scheduler Jobs"],
	},
	{
		title: "Products",
		description: "Setup and manage loan products",
		icon: CreditCard,
		href: "/config/products/loans",
		items: ["Loan Products"],
	},
	{
		title: "Operations",
		description: "Manage close of business, batch operations, and audit trails",
		icon: Clock,
		href: "/config/operations/cob",
		items: [
			"Close of Business",
			"Clients",
			"Loans",
			"Transactions",
			"Batch Operations",
			"Audit Trail",
			"Reports",
		],
	},
];

export default function ConfigOverviewPage() {
	return (
		<PageShell
			title="Configuration"
			subtitle="Manage your neobank platform settings and configuration"
		>
			<div className="grid gap-6 md:grid-cols-2">
				{configModules.map((module) => {
					const Icon = module.icon;
					return (
						<Link key={module.title} href={module.href}>
							<Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
								<CardHeader>
									<div className="flex items-center gap-3">
										<div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10">
											<Icon className="h-6 w-6 text-primary" />
										</div>
										<div>
											<CardTitle className="text-xl">{module.title}</CardTitle>
											<CardDescription>{module.description}</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<ul className="space-y-1 text-sm text-muted-foreground">
										{module.items.map((item) => (
											<li key={item} className="flex items-center gap-2">
												<span className="h-1.5 w-1.5 rounded-full bg-primary" />
												{item}
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						</Link>
					);
				})}
			</div>
		</PageShell>
	);
}
