import { TenantSwitcher } from '@/components/config/tenant-switcher';
import { Sidebar } from '@/components/config/sidebar';
import { Separator } from '@/components/ui/separator';

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <TenantSwitcher />
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
