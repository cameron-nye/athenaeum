'use client';

/**
 * InteractiveChoreList Component
 * Touch-friendly chore list with swipe-to-complete gestures
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import { Check, AlertTriangle, Clock, MoreHorizontal } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useCompletionFlow, type ChoreAssignment, type HouseholdMember } from './DisplayContext';
import { ChoreCompletionFlow } from './ChoreCompletionFlow';

interface InteractiveChoreListProps {
  assignments: ChoreAssignment[];
  householdMembers: HouseholdMember[];
  maxItems?: number;
}

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

interface InteractiveChoreItemProps {
  assignment: ChoreAssignment;
  index: number;
  onSwipeComplete: (assignmentId: string) => void;
}

function InteractiveChoreItem({ assignment, index, onSwipeComplete }: InteractiveChoreItemProps) {
  const { label, isOverdue, isToday } = getDateLabel(assignment.due_date);
  const isCompleted = !!assignment.completed_at;

  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [1, 0.5]);
  const scale = useTransform(x, [0, 100], [1, 0.95]);
  const checkOpacity = useTransform(x, [0, 80, 100], [0, 0.5, 1]);
  const checkScale = useTransform(x, [0, 80, 100], [0.5, 0.8, 1]);

  const [isDragging, setIsDragging] = useState(false);

  const bind = useDrag(
    ({ down, movement: [mx], cancel }) => {
      setIsDragging(down);

      if (!down) {
        // Released - check if should complete
        if (mx > 100 && !isCompleted) {
          onSwipeComplete(assignment.id);
        }
        x.set(0);
        return;
      }

      // Only allow right swipe, and only for incomplete chores
      if (mx < 0 || isCompleted) {
        x.set(0);
        return;
      }

      // Limit max drag
      if (mx > 150) {
        cancel();
        onSwipeComplete(assignment.id);
        x.set(0);
        return;
      }

      x.set(mx);
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
    }
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe reveal background */}
      {!isCompleted && (
        <motion.div
          style={{ opacity: checkOpacity }}
          className="absolute inset-0 flex items-center bg-green-500 pl-6"
        >
          <motion.div style={{ scale: checkScale }}>
            <Check className="h-8 w-8 text-white" />
          </motion.div>
          <span className="ml-3 font-medium text-white">Complete</span>
        </motion.div>
      )}

      {/* Main item - gesture handlers applied to wrapper */}
      <div {...(isCompleted ? {} : bind())}>
        <motion.div
          style={{ x, opacity, scale }}
          className={`relative flex touch-pan-y items-center gap-4 rounded-xl p-4 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${
            isCompleted
              ? 'bg-muted/50'
              : isOverdue
                ? 'bg-red-500/10 ring-2 ring-red-500/30'
                : isToday
                  ? 'bg-blue-500/10'
                  : 'bg-white dark:bg-neutral-800'
          }`}
        >
        {/* Status indicator */}
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
            isCompleted
              ? 'bg-green-500/20 text-green-500'
              : isOverdue
                ? 'bg-red-500/20'
                : 'bg-blue-500/10'
          }`}
        >
          {isCompleted ? (
            <Check className="h-7 w-7" />
          ) : isOverdue ? (
            <AlertTriangle className="h-7 w-7 text-red-500" />
          ) : (
            <span>{assignment.chore.icon || '✨'}</span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-lg font-medium ${isCompleted ? 'text-neutral-500 line-through' : ''}`}
          >
            {assignment.chore.title}
          </div>
          <div
            className={`mt-1 flex items-center text-sm ${
              isOverdue ? 'font-medium text-red-500' : 'text-neutral-500'
            }`}
          >
            <Clock className="mr-1.5 h-4 w-4" />
            {label}
          </div>
        </div>

        {/* Assignee */}
        {assignment.user ? (
          <UserAvatar
            name={assignment.user.display_name}
            avatarUrl={assignment.user.avatar_url}
            size="lg"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600">
            <span className="text-sm text-neutral-400">?</span>
          </div>
        )}

        {/* Points badge */}
        {assignment.chore.points > 0 && !isCompleted && (
          <div className="flex-shrink-0 rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
            +{assignment.chore.points}
          </div>
        )}

        {/* Swipe hint for incomplete items */}
        {!isCompleted && !isDragging && (
          <div className="absolute right-4 text-xs text-neutral-400">← swipe to complete</div>
        )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function InteractiveChoreList({
  assignments,
  householdMembers,
  maxItems = 20,
}: InteractiveChoreListProps) {
  const { flow, start, cancel } = useCompletionFlow();

  // Sort assignments: overdue first, then today, then upcoming
  const sortedAssignments = useMemo(() => {
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

    result.overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
    result.today.sort((a, b) => a.chore.title.localeCompare(b.chore.title));
    result.upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return [...result.overdue, ...result.today, ...result.upcoming, ...result.completed].slice(
      0,
      maxItems
    );
  }, [assignments, maxItems]);

  const handleSwipeComplete = (assignmentId: string) => {
    start(assignmentId);
  };

  const currentAssignment = flow
    ? assignments.find((a) => a.id === flow.assignmentId)
    : null;

  if (sortedAssignments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-5xl">✅</div>
          <div className="text-2xl font-semibold text-neutral-700 dark:text-neutral-300">
            All caught up!
          </div>
          <div className="mt-1 text-neutral-500">No chores due</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full space-y-3 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {sortedAssignments.map((assignment, index) => (
            <InteractiveChoreItem
              key={assignment.id}
              assignment={assignment}
              index={index}
              onSwipeComplete={handleSwipeComplete}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Completion flow modal */}
      <AnimatePresence>
        {flow && currentAssignment && (
          <ChoreCompletionFlow
            assignment={currentAssignment}
            householdMembers={householdMembers}
            onClose={cancel}
          />
        )}
      </AnimatePresence>
    </>
  );
}
