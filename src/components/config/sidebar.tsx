"use client";

import {
	AlertCircle,
	Banknote,
	Building2,
	Calendar,
	CalendarDays,
	ChevronDown,
	Clock,
	CreditCard,
	DollarSign,
	FileBarChart2,
	FileText,
	Globe,
	Hash,
	LayoutGrid,
	Link2,
	PiggyBank,
	Receipt,
	Settings,
	Shield,
	Timer,
	UserCog,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	children?: NavItem[];
}

const navItems: NavItem[] = [
	{
		title: "Overview",
		href: "/config",
		icon: LayoutGrid,
	},
	{
		title: "Customer Operations",
		href: "/config/operations/clients",
		icon: Users,
		children: [
			{
				title: "Clients",
				href: "/config/operations/clients",
				icon: Users,
			},
			{
				title: "Loans",
				href: "/config/operations/loans",
				icon: Banknote,
			},
			{
				title: "Transactions",
				href: "/config/operations/transactions",
				icon: Receipt,
			},
		],
	},
	{
		title: "Operational Controls",
		href: "/config/operations/cob",
		icon: Clock,
		children: [
			{
				title: "Close of Business",
				href: "/config/operations/cob",
				icon: Clock,
			},
			{
				title: "Batch Operations",
				href: "/config/operations/batch",
				icon: Zap,
			},
			{
				title: "Audit Trail",
				href: "/config/operations/audits",
				icon: FileText,
			},
			{
				title: "Reports",
				href: "/config/operations/reports",
				icon: FileBarChart2,
			},
			{
				title: "Working Days",
				href: "/config/organisation/working-days",
				icon: Clock,
			},
			{
				title: "Holidays",
				href: "/config/organisation/holidays",
				icon: Calendar,
			},
			{
				title: "Business Date",
				href: "/config/organisation/business-date",
				icon: CalendarDays,
			},
			{
				title: "Delinquency Buckets",
				href: "/config/organisation/delinquency-buckets",
				icon: AlertCircle,
			},
		],
	},
	{
		title: "Products & Finance",
		href: "/config/products/loans",
		icon: DollarSign,
		children: [
			{
				title: "Loan Products",
				href: "/config/products/loans",
				icon: CreditCard,
			},
			{
				title: "Savings Products",
				href: "/config/products/savings",
				icon: PiggyBank,
			},
			{
				title: "Currencies",
				href: "/config/financial/currencies",
				icon: DollarSign,
			},
			{
				title: "Accounting Setup",
				href: "/config/financial/accounting",
				icon: Link2,
			},
			{
				title: "Account Number Formats",
				href: "/config/organisation/account-number-formats",
				icon: Hash,
			},
		],
	},
	{
		title: "People & Access",
		href: "/config/organisation/offices",
		icon: Shield,
		children: [
			{
				title: "Offices",
				href: "/config/organisation/offices",
				icon: Building2,
			},
			{ title: "Staff", href: "/config/organisation/staff", icon: Users },
			{ title: "Users", href: "/config/organisation/users", icon: UserCog },
			{
				title: "Roles & Permissions",
				href: "/config/organisation/roles",
				icon: Shield,
			},
			{
				title: "Maker Checker",
				href: "/config/system/maker-checker",
				icon: Shield,
			},
		],
	},
	{
		title: "Platform Settings",
		href: "/config/system/codes",
		icon: Settings,
		children: [
			{ title: "Code Registry", href: "/config/system/codes", icon: Settings },
			{
				title: "Global Configuration",
				href: "/config/system/global",
				icon: Globe,
			},
			{
				title: "Scheduler Jobs",
				href: "/config/system/scheduler",
				icon: Timer,
			},
		],
	},
];

function matchesPath(
	currentPath: string | null,
	targetPath: string,
	includeDescendants = false,
) {
	if (!currentPath) {
		return false;
	}

	return (
		currentPath === targetPath ||
		(includeDescendants && currentPath.startsWith(`${targetPath}/`))
	);
}

function isSectionActive(item: NavItem, currentPath: string | null) {
	if (!item.children?.length) {
		return matchesPath(currentPath, item.href);
	}

	return item.children.some((child) =>
		matchesPath(currentPath, child.href, true),
	);
}

export function Sidebar() {
	const pathname = usePathname();
	const [openSections, setOpenSections] = useState<string[]>(() => {
		const activeSection = navItems.find((item) =>
			isSectionActive(item, pathname),
		);
		return activeSection ? [activeSection.href] : [];
	});

	useEffect(() => {
		const activeSection = navItems.find((item) =>
			isSectionActive(item, pathname),
		);
		if (!activeSection) {
			return;
		}

		setOpenSections((prev) =>
			prev.includes(activeSection.href) ? prev : [...prev, activeSection.href],
		);
	}, [pathname]);

	const toggleSection = (href: string) => {
		setOpenSections((prev) =>
			prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
		);
	};

	return (
		<nav className="flex flex-col gap-0.5 px-2.5 py-2">
			{navItems.map((item, index) => {
				const hasChildren = item.children && item.children.length > 0;
				const isActive = isSectionActive(item, pathname);
				const isOpen = openSections.includes(item.href);
				const Icon = item.icon;

				return (
					<div key={item.href}>
						{index > 0 && <Separator className="my-1.5" />}

						{hasChildren ? (
							<button
								onClick={() => toggleSection(item.href)}
								className={cn(
									"flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-[14px] font-medium transition-all duration-200",
									isActive
										? "bg-primary/8 text-primary font-semibold"
										: "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								<span className="flex-1 text-left">{item.title}</span>
								<ChevronDown
									className={cn(
										"h-3.5 w-3.5 transition-transform duration-200",
										isOpen && "rotate-180",
									)}
								/>
							</button>
						) : (
							<Link
								href={item.href}
								className={cn(
									"flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-[14px] font-medium transition-all duration-200",
									isActive
										? "bg-primary/8 text-primary font-semibold"
										: "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
								{item.title}
							</Link>
						)}

						{hasChildren && isOpen && (
							<div className="ml-3.5 mt-0.5 flex flex-col overflow-hidden">
								{item.children!.map((child) => {
									const ChildIcon = child.icon;
									const isChildActive = matchesPath(pathname, child.href, true);

									return (
										<Link
											key={child.href}
											href={child.href}
											className={cn(
												"flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] font-medium transition-all duration-200",
												isChildActive
													? "bg-primary/8 text-primary font-semibold"
													: "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
											)}
										>
											<ChildIcon className="h-3.5 w-3.5" />
											{child.title}
										</Link>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</nav>
	);
}
