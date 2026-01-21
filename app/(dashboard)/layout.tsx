import { AppShell } from '@/components/layout';
import { FilterProvider } from '@/contexts/FilterContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <AppShell>{children}</AppShell>
    </FilterProvider>
  );
}
