'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-6 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
