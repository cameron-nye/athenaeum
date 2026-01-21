# Skylight Calendar-Style Redesign

## Overview

Transform Athenaeum from its current dashboard-centric design to a beautiful, display-first family calendar inspired by [Skylight Calendar](https://myskylight.com/calendar/).

### Design Philosophy

- **Display-first**: Optimized for wall-mounted Raspberry Pi displays (1920x1080, 24/7 operation)
- **Glanceable**: Information hierarchy for quick comprehension from across the room
- **Family-friendly**: Large touch targets (48px minimum, 56-64px for primary actions), clear typography
- **Ambient**: Subtle animations enhance without distracting (CSS-only for performance)

### Tech Stack

- **Components**: ShadCN UI (Tailwind v4 compatible)
- **Animations**: Framer Motion (already installed) + CSS animations for ambient effects
- **Icons**: Lucide React
- **Styling**: Tailwind CSS 4 with OKLCH color system

> **Note**: MotionPrimitives removed from stack - Framer Motion + CSS provides equivalent functionality with better performance control and smaller bundle.

---

## Phase 1: Foundation (Tailwind 4 + ShadCN)

### 1.1 Tailwind CSS 4 Migration

```bash
npm install tailwindcss@next @tailwindcss/postcss@next
```

**postcss.config.mjs**:

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**app/globals.css** (Tailwind v4 structure):

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

/* Zen Garden Palette - OKLCH colors */
:root {
  --background: oklch(0.98 0.01 120); /* Warm off-white */
  --foreground: oklch(0.25 0.02 60); /* Deep warm gray */
  --card: oklch(1 0 0); /* Pure white */
  --card-foreground: oklch(0.25 0.02 60);
  --primary: oklch(0.55 0.15 145); /* Sage green */
  --primary-foreground: oklch(0.98 0.01 120);
  --secondary: oklch(0.85 0.03 80); /* Warm sand */
  --accent: oklch(0.7 0.12 55); /* Terracotta */
  --muted: oklch(0.92 0.02 90);
  --muted-foreground: oklch(0.5 0.02 60);
  --border: oklch(0.88 0.02 90);
  --ring: oklch(0.55 0.15 145);
  --radius: 0.75rem;

  /* Sidebar specific */
  --sidebar: oklch(0.96 0.02 100);
  --sidebar-foreground: oklch(0.3 0.02 60);
  --sidebar-accent: oklch(0.55 0.15 145 / 0.1);
}

.dark {
  --background: oklch(0.15 0.02 60);
  --foreground: oklch(0.92 0.01 90);
  --card: oklch(0.18 0.02 60);
  --primary: oklch(0.65 0.12 145);
  --secondary: oklch(0.25 0.03 80);
  --accent: oklch(0.6 0.1 55);
  --muted: oklch(0.22 0.02 60);
  --border: oklch(0.28 0.02 60);
  --sidebar: oklch(0.12 0.02 60);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
}

/* Ambient Glow Effects (CSS-only, no JS) */
.glow {
  box-shadow: 0 0 20px oklch(var(--primary) / 0.4);
  transition: box-shadow 0.3s ease;
}

.glow-pulse {
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px oklch(var(--primary) / 0.4);
  }
  50% {
    box-shadow: 0 0 16px oklch(var(--primary) / 0.6);
  }
}

/* Stagger animation for lists */
.stagger-item {
  opacity: 0;
  transform: translateY(10px);
  animation: stagger-in 0.4s ease forwards;
}

@keyframes stagger-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Apply stagger delays via nth-child */
.stagger-item:nth-child(1) {
  animation-delay: 0ms;
}
.stagger-item:nth-child(2) {
  animation-delay: 50ms;
}
.stagger-item:nth-child(3) {
  animation-delay: 100ms;
}
.stagger-item:nth-child(4) {
  animation-delay: 150ms;
}
.stagger-item:nth-child(5) {
  animation-delay: 200ms;
}
/* ... up to 10 items */
```

### 1.2 ShadCN Setup

```bash
npx shadcn@latest init
```

Select:

- Style: New York
- Base color: Neutral (we override with Zen Garden)
- CSS variables: Yes

Install core components:

```bash
npx shadcn@latest add button card avatar badge calendar sidebar
```

### 1.3 Button Variants (CVA extension)

**components/ui/button.tsx** additions:

```typescript
const buttonVariants = cva('inline-flex items-center justify-center gap-2 ...', {
  variants: {
    variant: {
      // ... existing variants
      glow: 'bg-primary text-primary-foreground glow-pulse hover:shadow-lg',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20',
    },
    size: {
      // ... existing sizes
      touch: 'h-14 min-w-14 px-6 text-lg', // 56px for touch targets
      'touch-lg': 'h-16 min-w-16 px-8 text-xl', // 64px for primary actions
    },
  },
});
```

---

## Phase 2: State Architecture

### 2.1 FilterContext (Cross-cutting filter state)

**contexts/FilterContext.tsx**:

```typescript
import { createContext, useContext, useReducer, ReactNode } from 'react';

interface FilterState {
  selectedMembers: string[];
  selectedCalendars: string[];
  dateRange: { start: Date; end: Date };
}

type FilterAction =
  | { type: 'SET_MEMBERS'; payload: string[] }
  | { type: 'SET_CALENDARS'; payload: string[] }
  | { type: 'SET_DATE_RANGE'; payload: { start: Date; end: Date } }
  | { type: 'RESET' };

const initialState: FilterState = {
  selectedMembers: [],
  selectedCalendars: [],
  dateRange: { start: new Date(), end: new Date() },
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_MEMBERS':
      return { ...state, selectedMembers: action.payload };
    case 'SET_CALENDARS':
      return { ...state, selectedCalendars: action.payload };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const FilterContext = createContext<{
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
} | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);
  return (
    <FilterContext.Provider value={{ state, dispatch }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}
```

### 2.2 DisplayContext (Display mode state)

**contexts/DisplayContext.tsx**:

```typescript
interface DisplayState {
  mode: 'interactive' | 'display';
  brightness: number;
  autoRotate: boolean;
  rotateInterval: number; // minutes
}

// Similar useReducer pattern as FilterContext
```

---

## Phase 3: Layout Structure

### 3.1 Route Groups

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx           # Minimal auth layout
├── (dashboard)/
│   ├── layout.tsx           # Full AppShell with sidebar
│   ├── page.tsx             # Dashboard home
│   ├── calendar/page.tsx
│   ├── chores/page.tsx
│   └── settings/page.tsx
├── (display)/
│   ├── layout.tsx           # Display-only layout (NO AppShell)
│   └── page.tsx             # Display mode view
├── layout.tsx               # Root: providers only
└── globals.css
```

### 3.2 AppShell Component

**components/layout/AppShell.tsx**:

```typescript
'use client';

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
            <SidebarTrigger />
            {/* Header content */}
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
```

### 3.3 AppSidebar Component

**components/layout/AppSidebar.tsx**:

```typescript
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
} from '@/components/ui/sidebar';
import { Calendar, CheckSquare, Users, Settings, Monitor } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Chores', href: '/chores', icon: CheckSquare },
  { title: 'Family', href: '/family', icon: Users },
  { title: 'Display', href: '/display', icon: Monitor },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h1 className="text-xl font-semibold">Athenaeum</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
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

        {/* Family Filter Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Family Members</SidebarGroupLabel>
          <SidebarGroupContent>
            <FamilyFilterList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenuButton asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
```

---

## Phase 4: Core Components

### 4.1 Family Member Avatar

**components/family/FamilyAvatar.tsx**:

```typescript
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface FamilyAvatarProps {
  member: {
    id: string;
    name: string;
    avatarUrl?: string;
    color: string;
  };
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',  // Touch-friendly
};

export function FamilyAvatar({ member, size = 'md', selected, onClick }: FamilyAvatarProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2',
        onClick && 'hover:scale-105 cursor-pointer'
      )}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={member.avatarUrl} alt={member.name} />
        <AvatarFallback
          style={{ backgroundColor: member.color }}
          className="text-white font-medium"
        >
          {member.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}
```

### 4.2 Chore Card

**components/chores/ChoreCard.tsx**:

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FamilyAvatar } from '@/components/family/FamilyAvatar';
import { Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChoreCardProps {
  chore: {
    id: string;
    title: string;
    assignee: FamilyMember;
    dueDate: Date;
    completed: boolean;
    recurring?: string;
  };
  onComplete: (id: string) => void;
}

export function ChoreCard({ chore, onComplete }: ChoreCardProps) {
  const isOverdue = !chore.completed && chore.dueDate < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card
        className={cn(
          'transition-all duration-200 hover:shadow-md',
          chore.completed && 'opacity-60',
          isOverdue && 'border-destructive/50'
        )}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <FamilyAvatar member={chore.assignee} size="lg" />

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-medium truncate',
              chore.completed && 'line-through text-muted-foreground'
            )}>
              {chore.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={cn(
                'text-sm text-muted-foreground',
                isOverdue && 'text-destructive'
              )}>
                {formatDueDate(chore.dueDate)}
              </span>
              {chore.recurring && (
                <Badge variant="secondary" className="text-xs">
                  {chore.recurring}
                </Badge>
              )}
            </div>
          </div>

          <Button
            size="touch"
            variant={chore.completed ? 'secondary' : 'default'}
            onClick={() => onComplete(chore.id)}
            className="shrink-0"
          >
            <Check className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

## Phase 5: Calendar Views

### 5.1 Month View

**components/calendar/MonthView.tsx**:

```typescript
'use client';

import { useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

export function MonthView({ events, currentDate, onDateSelect }: MonthViewProps) {
  const { state: filters } = useFilters();

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filters.selectedMembers.length > 0) {
        return filters.selectedMembers.includes(event.assigneeId);
      }
      return true;
    });
  }, [events, filters.selectedMembers]);

  const days = useMemo(() => generateMonthDays(currentDate), [currentDate]);

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      <AnimatePresence mode="popLayout">
        {days.map((day, index) => (
          <motion.button
            key={day.toISOString()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.01 }}
            onClick={() => onDateSelect(day)}
            className={cn(
              'aspect-square p-2 rounded-lg transition-colors',
              'hover:bg-accent focus:ring-2 focus:ring-ring',
              isToday(day) && 'bg-primary/10 font-bold',
              !isSameMonth(day, currentDate) && 'text-muted-foreground/50'
            )}
          >
            <span className="text-sm">{day.getDate()}</span>
            <DayEvents events={getEventsForDay(filteredEvents, day)} />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### 5.2 Week View

**components/calendar/WeekView.tsx**:

```typescript
'use client';

import { useFilters } from '@/contexts/FilterContext';
import { motion } from 'framer-motion';

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
}

export function WeekView({ events, currentDate }: WeekViewProps) {
  const { state: filters } = useFilters();
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="flex flex-col h-full">
      {/* Header with days */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(day => (
          <div key={day.toISOString()} className="p-4 text-center border-r last:border-r-0">
            <div className="text-sm text-muted-foreground">
              {format(day, 'EEE')}
            </div>
            <div className={cn(
              'text-2xl font-light mt-1',
              isToday(day) && 'text-primary font-medium'
            )}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 grid grid-cols-7 relative">
        {/* Time labels */}
        <TimeLabels />

        {/* Day columns with events */}
        {weekDays.map(day => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            events={getEventsForDay(events, day)}
            filters={filters}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 6: Display Mode

### 6.1 Display Layout (Isolated from AppShell)

**app/(display)/layout.tsx**:

```typescript
import { DisplayProvider } from '@/contexts/DisplayContext';
import { FilterProvider } from '@/contexts/FilterContext';

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <DisplayProvider>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </DisplayProvider>
    </FilterProvider>
  );
}
```

> **Note**: Display mode does NOT use AppShell - it's a fullscreen experience optimized for wall-mounted displays.

### 6.2 Display View

**app/(display)/page.tsx**:

```typescript
'use client';

import { useDisplay } from '@/contexts/DisplayContext';
import { usePixelShift } from '@/hooks/usePixelShift';
import { DisplayCalendar } from '@/components/display/DisplayCalendar';
import { DisplayChores } from '@/components/display/DisplayChores';
import { DisplayClock } from '@/components/display/DisplayClock';

export default function DisplayPage() {
  const { state } = useDisplay();
  const offset = usePixelShift();

  return (
    <div
      className="h-screen w-screen overflow-hidden p-8 grid grid-cols-3 gap-8"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {/* Large clock */}
      <div className="col-span-3">
        <DisplayClock />
      </div>

      {/* Calendar - 2 columns */}
      <div className="col-span-2 row-span-2">
        <DisplayCalendar />
      </div>

      {/* Chores list - 1 column */}
      <div className="row-span-2">
        <DisplayChores />
      </div>
    </div>
  );
}
```

### 6.3 Display-Optimized Hooks

**hooks/usePixelShift.ts** (Burn-in prevention):

```typescript
import { useState, useEffect } from 'react';

const MAX_SHIFT = 3; // pixels
const SHIFT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function usePixelShift() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset({
        x: Math.round((Math.random() - 0.5) * 2 * MAX_SHIFT),
        y: Math.round((Math.random() - 0.5) * 2 * MAX_SHIFT),
      });
    }, SHIFT_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return offset;
}
```

**hooks/useHealthCheck.ts** (24/7 reliability):

```typescript
import { useEffect, useRef } from 'react';

const HEALTH_INTERVAL = 60 * 1000; // 1 minute
const MAX_ERRORS = 5;

export function useHealthCheck(onUnhealthy: () => void) {
  const errorCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error('Health check failed');
        errorCount.current = 0;
      } catch {
        errorCount.current++;
        if (errorCount.current >= MAX_ERRORS) {
          onUnhealthy();
        }
      }
    }, HEALTH_INTERVAL);

    return () => clearInterval(interval);
  }, [onUnhealthy]);
}
```

**hooks/useMemoryMonitor.ts** (Memory leak prevention):

```typescript
import { useEffect, useCallback } from 'react';

const MEMORY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MEMORY_THRESHOLD = 0.85; // 85% of heap limit

export function useMemoryMonitor(onHighMemory: () => void) {
  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (usageRatio > MEMORY_THRESHOLD) {
        onHighMemory();
      }
    }
  }, [onHighMemory]);

  useEffect(() => {
    const interval = setInterval(checkMemory, MEMORY_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkMemory]);
}
```

---

## Phase 7: Security Architecture

### 7.1 Access Tiers

```typescript
type AccessTier = 'PUBLIC' | 'FAMILY_MEMBER' | 'PARENT';

interface DisplayConfig {
  tier: AccessTier;
  allowedViews: string[];
  requiresPin: boolean;
}

const tierPermissions: Record<AccessTier, string[]> = {
  PUBLIC: ['calendar:read'],
  FAMILY_MEMBER: ['calendar:read', 'chores:read', 'chores:complete'],
  PARENT: ['calendar:*', 'chores:*', 'family:*', 'settings:*'],
};
```

### 7.2 PIN Validation for Sensitive Actions

**components/security/PinDialog.tsx**:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onValidate: (pin: string) => Promise<boolean>;
  action: string;
}

export function PinDialog({ open, onClose, onValidate, action }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    const valid = await onValidate(pin);
    if (valid) {
      setPin('');
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter PIN to {action}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key) => (
            <Button
              key={key}
              size="touch-lg"
              variant="outline"
              onClick={() => {
                if (key === 'del') setPin(p => p.slice(0, -1));
                else if (key !== '') setPin(p => p + key);
              }}
              disabled={key === ''}
            >
              {key === 'del' ? '←' : key}
            </Button>
          ))}
        </div>
        {error && <p className="text-destructive text-center">Invalid PIN</p>}
        <Button size="touch" onClick={handleSubmit} disabled={pin.length < 4}>
          Confirm
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 7.3 Calendar Sync Sanitization

```typescript
import DOMPurify from 'dompurify';

export function sanitizeCalendarEvent(event: RawCalendarEvent): CalendarEvent {
  return {
    ...event,
    title: DOMPurify.sanitize(event.title, { ALLOWED_TAGS: [] }),
    description: event.description
      ? DOMPurify.sanitize(event.description, { ALLOWED_TAGS: ['b', 'i', 'br'] })
      : undefined,
    location: event.location ? DOMPurify.sanitize(event.location, { ALLOWED_TAGS: [] }) : undefined,
  };
}
```

---

## Phase 8: Polish & Animation

### 8.1 Page Transitions

**components/layout/PageTransition.tsx**:

```typescript
'use client';

import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

### 8.2 Loading States

**components/ui/skeleton-card.tsx**:

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-14 w-14 rounded-lg" />
      </CardContent>
    </Card>
  );
}
```

---

## Performance Budget

| Metric                   | Target          | Measurement        |
| ------------------------ | --------------- | ------------------ |
| First Contentful Paint   | < 1.5s          | Lighthouse         |
| Time to Interactive      | < 3s            | Lighthouse         |
| Cumulative Layout Shift  | < 0.1           | Lighthouse         |
| JS Bundle (main)         | < 150KB gzipped | Build output       |
| Concurrent JS Animations | ≤ 2             | Runtime monitoring |
| Memory (24h operation)   | < 500MB         | Chrome DevTools    |

### Animation Guidelines

1. **Prefer CSS animations** for ambient effects (glow, pulse, stagger)
2. **Use Framer Motion** for interactive animations (list reorder, page transitions)
3. **Maximum 2 concurrent JS animations** to maintain 60fps
4. **Always provide `will-change`** for animated properties
5. **Clean up intervals/timeouts** in useEffect returns

---

## Implementation Order

1. **Foundation**: Tailwind 4 migration, ShadCN setup, globals.css with Zen Garden palette
2. **State**: FilterContext, DisplayContext with useReducer
3. **Layout**: Route groups, AppShell, AppSidebar
4. **Components**: FamilyAvatar, ChoreCard, Calendar components
5. **Views**: MonthView, WeekView, DayView
6. **Display**: Display layout (isolated), display hooks, DisplayPage
7. **Security**: Access tiers, PIN dialog, sanitization
8. **Polish**: Page transitions, loading states, performance optimization

---

## Testing Checklist

- [ ] Tailwind 4 compiles without errors
- [ ] ShadCN components render correctly
- [ ] OKLCH colors display properly in all browsers
- [ ] Sidebar navigation works
- [ ] Family filtering updates calendar view
- [ ] Chore completion persists
- [ ] Display mode runs 24h without memory leaks
- [ ] Pixel shift prevents burn-in
- [ ] Touch targets meet 48px minimum
- [ ] Animations maintain 60fps
- [ ] Health check recovers from failures
