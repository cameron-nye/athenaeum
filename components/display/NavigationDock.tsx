'use client';

/**
 * NavigationDock Component
 * Bottom navigation dock for display views using motion-primitives
 * Provides touch-friendly navigation between Calendar, Chores, Photos, and Settings
 */

import { Dock, DockItem, DockIcon, DockLabel } from '@/components/motion-primitives/dock';
import { Calendar, CheckSquare, Image, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DisplayView = 'calendar' | 'chores' | 'photos' | 'settings';

interface NavigationDockProps {
  activeView: DisplayView;
  onViewChange: (view: DisplayView) => void;
  overdueCount?: number;
  className?: string;
}

interface NavItem {
  id: DisplayView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function NavigationDock({
  activeView,
  onViewChange,
  overdueCount = 0,
  className,
}: NavigationDockProps) {
  const navItems: NavItem[] = [
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="h-full w-full" />,
    },
    {
      id: 'chores',
      label: 'Chores',
      icon: <CheckSquare className="h-full w-full" />,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: <Image className="h-full w-full" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-full w-full" />,
    },
  ];

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-50 pb-safe', className)}>
      <Dock
        magnification={80}
        distance={120}
        panelHeight={72}
        className="bg-white/90 shadow-lg backdrop-blur-sm dark:bg-neutral-900/90"
      >
        {navItems.map((item) => (
          <DockItem
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              'relative aspect-square min-h-[64px] min-w-[64px] cursor-pointer rounded-xl p-3 transition-colors',
              activeView === item.id
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
          >
            <DockIcon className="h-full w-full">
              {item.icon}
              {item.badge && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
