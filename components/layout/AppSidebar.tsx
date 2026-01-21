'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Calendar, CheckSquare, Users, Settings, Monitor, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Calendar', href: '/calendars', icon: Calendar },
  { title: 'Chores', href: '/chores', icon: CheckSquare },
  { title: 'Display', href: '/settings/displays', icon: Monitor },
];

const settingsItems = [{ title: 'Settings', href: '/settings', icon: Settings }];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Calendar className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Athenaeum
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Family Members</SidebarGroupLabel>
          <SidebarGroupContent>
            <FamilyFilterList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function FamilyFilterList() {
  // Placeholder - will be connected to FilterContext and family member data
  return (
    <div className="text-muted-foreground px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
      No family members configured
    </div>
  );
}
