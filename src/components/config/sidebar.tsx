'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  UserCog,
  Shield,
  DollarSign,
  CreditCard,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/config',
    icon: LayoutGrid,
  },
  {
    title: 'Organisation',
    href: '/config/organisation',
    icon: Building2,
    children: [
      { title: 'Offices', href: '/config/organisation/offices', icon: Building2 },
      { title: 'Staff', href: '/config/organisation/staff', icon: Users },
      { title: 'Users', href: '/config/organisation/users', icon: UserCog },
      { title: 'Roles & Permissions', href: '/config/organisation/roles', icon: Shield },
    ],
  },
  {
    title: 'Financial Setup',
    href: '/config/financial',
    icon: DollarSign,
    children: [
      { title: 'Currencies', href: '/config/financial/currencies', icon: DollarSign },
    ],
  },
  {
    title: 'Products',
    href: '/config/products',
    icon: CreditCard,
    children: [
      { title: 'Loan Products', href: '/config/products/loans', icon: CreditCard },
    ],
  },
  {
    title: 'Operations',
    href: '/config/operations',
    icon: Clock,
    children: [
      { title: 'Close of Business', href: '/config/operations/cob', icon: Clock },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-3 py-4">
      {navItems.map((item, index) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <div key={item.href}>
            {index > 0 && <Separator className="my-2" />}

            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>

            {item.children && item.children.length > 0 && (
              <div className="ml-6 mt-1 flex flex-col gap-1">
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = pathname === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        isChildActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
