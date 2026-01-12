import { TenantSwitcher } from '@/components/config/tenant-switcher';
import { Sidebar } from '@/components/config/sidebar';
import { TopBar } from '@/components/config/topbar';

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 border-r border-sidebar-border bg-sidebar flex flex-col">
        <TenantSwitcher />
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        <div className="container mx-auto px-12 py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
