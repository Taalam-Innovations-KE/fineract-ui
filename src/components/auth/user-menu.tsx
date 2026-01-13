"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
	const { data: session, status } = useSession();

	if (status === "loading") {
		return (
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<Button asChild size="sm">
				<Link href="/auth/signin">Sign In</Link>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
						<User className="h-4 w-4" />
					</div>
					<span className="hidden md:inline-block">
						{session.user.name || session.user.email}
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium">{session.user.name}</p>
						<p className="text-xs text-muted-foreground">
							{session.user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						href="/config/profile"
						className="flex items-center cursor-pointer"
					>
						<Settings className="mr-2 h-4 w-4" />
						Profile Settings
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						href="/auth/signout"
						className="flex items-center cursor-pointer text-destructive"
					>
						<LogOut className="mr-2 h-4 w-4" />
						Sign Out
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
