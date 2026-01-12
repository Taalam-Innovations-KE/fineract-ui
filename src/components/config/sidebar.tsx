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
  ChevronDown,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

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
  const [openSections, setOpenSections] = useState<string[]>(() => {
    // Auto-open the section that contains the current page
    const activeSection = navItems.find(
      (item) => pathname?.startsWith(item.href + '/') || pathname === item.href
    );
    return activeSection ? [activeSection.href] : [];
  });

  const toggleSection = (href: string) => {
    setOpenSections((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  return (
    <nav className="flex flex-col gap-3 px-5 py-6">
      {navItems.map((item, index) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        const isOpen = openSections.includes(item.href);
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;

        return (
          <div key={item.href}>
            {index > 0 && <Separator className="my-4" />}

            {hasChildren ? (
              <button
                onClick={() => toggleSection(item.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.title}
              </Link>
            )}

            {hasChildren && isOpen && (
              <div className="ml-6 mt-2 flex flex-col gap-1.5 overflow-hidden">
                {item.children!.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = pathname === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
                        isChildActive
                          ? 'bg-primary/8 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground'
                      )}
                    >
                      <ChildIcon className="h-[15px] w-[15px]" />
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
