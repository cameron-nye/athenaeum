'use client';

/**
 * Chore List Component for Pi Wall Display
 * REQ-5-018: Create display chore list component
 * Shows today's chores, overdue chores, and upcoming chores
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Clock } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';

export interface ChoreAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  chore: {
    id: string;
    title: string;
    icon: string | null;
    points: number;
  };
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ChoreListProps {
  assignments: ChoreAssignment[];
  showUpcoming?: boolean;
  maxItems?: number;
}

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20, height: 0 },
};

function getDateLabel(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean } {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date < today) {
    const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: daysAgo === 1 ? '1 day overdue' : `${daysAgo} days overdue`,
      isOverdue: true,
      isToday: false,
    };
  }

  if (date.getTime() === today.getTime()) {
    return { label: 'Today', isOverdue: false, isToday: true };
  }

  if (date.getTime() === tomorrow.getTime()) {
    return { label: 'Tomorrow', isOverdue: false, isToday: false };
  }

  return {
    label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    isOverdue: false,
    isToday: false,
  };
}

// UserInitials is now replaced by the shared UserAvatar component from @/components/ui/UserAvatar

function ChoreItem({ assignment, index }: { assignment: ChoreAssignment; index: number }) {
  const { label, isOverdue, isToday } = getDateLabel(assignment.due_date);
  const isCompleted = !!assignment.completed_at;

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: 'easeOut',
      }}
      layout
      className={`relative flex items-center gap-4 rounded-xl p-4 transition-colors ${
        isCompleted
          ? 'bg-muted/50 opacity-60'
          : isOverdue
            ? 'bg-destructive/10 ring-destructive/30 ring-2'
            : isToday
              ? 'bg-primary/10'
              : 'bg-card'
      }`}
    >
      {/* Status indicator */}
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
          isCompleted
            ? 'bg-green-500/20 text-green-500'
            : isOverdue
              ? 'bg-destructive/20'
              : 'bg-primary/10'
        }`}
      >
        {isCompleted ? (
          <Check className="h-6 w-6" />
        ) : isOverdue ? (
          <AlertTriangle className="text-destructive h-6 w-6" />
        ) : (
          <span>{assignment.chore.icon || '✨'}</span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className={`display-body truncate font-medium ${isCompleted ? 'line-through' : ''}`}>
          {assignment.chore.title}
        </div>
        <div
          className={`display-small mt-0.5 ${
            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
          }`}
        >
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          {label}
        </div>
      </div>

      {/* Assignee */}
      {assignment.user ? (
        <UserAvatar
          name={assignment.user.display_name}
          avatarUrl={assignment.user.avatar_url}
          size="md"
        />
      ) : (
        <div className="border-muted-foreground/30 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed">
          <span className="display-small text-muted-foreground">?</span>
        </div>
      )}

      {/* Points badge */}
      {assignment.chore.points > 0 && !isCompleted && (
        <div className="flex-shrink-0 rounded-full bg-amber-500/20 px-2.5 py-1 text-sm font-medium text-amber-500">
          +{assignment.chore.points}
        </div>
      )}
    </motion.div>
  );
}

export function ChoreList({ assignments, showUpcoming = true, maxItems = 8 }: ChoreListProps) {
  // Separate and sort assignments
  const { overdue, today, upcoming, completed } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];

    const result = {
      overdue: [] as ChoreAssignment[],
      today: [] as ChoreAssignment[],
      upcoming: [] as ChoreAssignment[],
      completed: [] as ChoreAssignment[],
    };

    assignments.forEach((a) => {
      if (a.completed_at) {
        // Recently completed (within 24h)
        const completedDate = new Date(a.completed_at);
        if (now.getTime() - completedDate.getTime() < 24 * 60 * 60 * 1000) {
          result.completed.push(a);
        }
      } else if (a.due_date < todayStr) {
        result.overdue.push(a);
      } else if (a.due_date === todayStr) {
        result.today.push(a);
      } else {
        result.upcoming.push(a);
      }
    });

    // Sort each by due_date
    result.overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
    result.today.sort((a, b) => a.chore.title.localeCompare(b.chore.title));
    result.upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return result;
  }, [assignments]);

  // Combine for display, prioritizing overdue and today
  const displayItems = useMemo(() => {
    const items: ChoreAssignment[] = [];

    // Add overdue first (most urgent)
    items.push(...overdue);

    // Add today's chores
    items.push(...today);

    // Add upcoming if enabled
    if (showUpcoming) {
      items.push(...upcoming);
    }

    // Add recently completed at end
    items.push(...completed);

    // Limit total items
    return items.slice(0, maxItems);
  }, [overdue, today, upcoming, completed, showUpcoming, maxItems]);

  const overdueCount = overdue.length;
  const todayCount = today.length;

  if (displayItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-4xl">✅</div>
          <div className="display-heading text-muted-foreground">All caught up!</div>
          <div className="display-small text-muted-foreground/70 mt-1">No chores due today</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Summary header */}
      <div className="mb-4 flex items-center gap-4">
        <div className="display-heading text-foreground">Chores</div>
        {overdueCount > 0 && (
          <div className="bg-destructive/20 text-destructive flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {overdueCount} overdue
          </div>
        )}
        {todayCount > 0 && (
          <div className="bg-primary/20 text-primary rounded-full px-2.5 py-1 text-sm font-medium">
            {todayCount} today
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {displayItems.map((assignment, index) => (
            <ChoreItem key={assignment.id} assignment={assignment} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
