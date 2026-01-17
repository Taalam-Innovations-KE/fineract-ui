"use client";

import {
	Banknote,
	Building2,
	ChevronDown,
	Clock,
	CreditCard,
	DollarSign,
	LayoutGrid,
	Settings,
	Shield,
	UserCog,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
		title: "Organisation",
		href: "/config/organisation",
		icon: Building2,
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
		],
	},
	{
		title: "Financial Setup",
		href: "/config/financial",
		icon: DollarSign,
		children: [
			{
				title: "Currencies",
				href: "/config/financial/currencies",
				icon: DollarSign,
			},
		],
	},
	{
		title: "System Configuration",
		href: "/config/system",
		icon: Settings,
		children: [
			{ title: "Code Registry", href: "/config/system/codes", icon: Settings },
		],
	},
	{
		title: "Products",
		href: "/config/products",
		icon: CreditCard,
		children: [
			{
				title: "Loan Products",
				href: "/config/products/loans",
				icon: CreditCard,
			},
		],
	},
	{
		title: "Operations",
		href: "/config/operations",
		icon: Clock,
		children: [
			{
				title: "Close of Business",
				href: "/config/operations/cob",
				icon: Clock,
			},
			{ title: "Clients", href: "/config/operations/clients", icon: Users },
			{ title: "Loans", href: "/config/operations/loans", icon: Banknote },
		],
	},
];

export function Sidebar() {
	const pathname = usePathname();
	const [openSections, setOpenSections] = useState<string[]>(() => {
		// Auto-open the section that contains the current page
		const activeSection = navItems.find(
			(item) => pathname?.startsWith(item.href + "/") || pathname === item.href,
		);
		return activeSection ? [activeSection.href] : [];
	});

	const toggleSection = (href: string) => {
		setOpenSections((prev) =>
			prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
		);
	};

	return (
		<nav className="flex flex-col gap-0.5 px-2.5 py-2">
			{navItems.map((item, index) => {
				const hasChildren = item.children && item.children.length > 0;
				// For items without children, only match exact path
				// For items with children, match if path starts with the href
				const isActive = hasChildren
					? pathname?.startsWith(item.href + "/")
					: pathname === item.href;
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
									const isChildActive = pathname === child.href;

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
