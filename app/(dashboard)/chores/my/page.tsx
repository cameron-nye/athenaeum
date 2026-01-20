'use client';

/**
 * My Chores page showing current user's assignments.
 * REQ-5-016: Create my chores view
 */

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  CheckCircle2,
  Calendar,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChoreInfo {
  id: string;
  title: string;
  icon: string | null;
  points: number;
}

interface UserInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Assignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  recurrence_rule: string | null;
  completed_at: string | null;
  created_at: string;
  chores: ChoreInfo;
  users: UserInfo | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff <= 7) return date.toLocaleDateString('en-US', { weekday: 'long' });

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

interface AssignmentCardProps {
  assignment: Assignment;
  onComplete: (id: string) => void;
  isUpdating: boolean;
}

function AssignmentCard({ assignment, onComplete, isUpdating }: AssignmentCardProps) {
  const overdue = isOverdue(assignment.due_date);
  const today = isToday(assignment.due_date);

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl p-4',
        'bg-white shadow-sm dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        'transition-all duration-200',
        overdue && 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
        today && !overdue && 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
      )}
    >
      {/* Chore icon */}
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
          overdue
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
        )}
      >
        {assignment.chores.icon || '✨'}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold text-gray-900 dark:text-white">
          {assignment.chores.title}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-sm">
          {overdue && (
            <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {formatDueDate(assignment.due_date)}
            </span>
          )}
          {!overdue && (
            <span
              className={cn(
                'flex items-center gap-1',
                today ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatDueDate(assignment.due_date)}
            </span>
          )}
          {assignment.chores.points > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              +{assignment.chores.points} pts
            </span>
          )}
        </div>
      </div>

      {/* Complete button */}
      <button
        onClick={() => onComplete(assignment.id)}
        disabled={isUpdating}
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2',
          'bg-gradient-to-r from-green-500 to-emerald-500',
          'hover:from-green-600 hover:to-emerald-600',
          'font-medium text-white shadow-md',
          'transition-all duration-200 hover:scale-105',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Done</span>
      </button>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-4 py-16"
    >
      <motion.div
        animate={{
          y: [-2, 2, -2],
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40"
      >
        <Sparkles className="h-12 w-12 text-green-500 dark:text-green-400" />
      </motion.div>

      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">All caught up!</h3>
      <p className="mb-6 max-w-sm text-center text-gray-500 dark:text-gray-400">
        You have no pending chores. Enjoy your free time!
      </p>

      <Link
        href="/chores"
        className={cn(
          'flex items-center gap-2 rounded-xl px-4 py-2',
          'text-indigo-600 hover:text-indigo-700',
          'dark:text-indigo-400 dark:hover:text-indigo-300',
          'transition-colors'
        )}
      >
        View all chores
      </Link>
    </motion.div>
  );
}

export default function MyChoresPage() {
  // Fetch current user's pending assignments, sorted by due date
  const {
    data: assignmentsData,
    error,
    isLoading,
    mutate,
  } = useSWR<{ assignments: Assignment[] }>(
    '/api/chores/assignments?user_id=me&status=pending',
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    }
  );

  const assignments = useMemo(
    () => assignmentsData?.assignments ?? [],
    [assignmentsData?.assignments]
  );

  // Separate overdue and upcoming assignments
  const { overdueAssignments, upcomingAssignments } = useMemo(() => {
    const overdue: Assignment[] = [];
    const upcoming: Assignment[] = [];

    for (const assignment of assignments) {
      if (isOverdue(assignment.due_date)) {
        overdue.push(assignment);
      } else {
        upcoming.push(assignment);
      }
    }

    // Sort overdue by date (oldest first - most urgent)
    overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
    // Sort upcoming by date (nearest first)
    upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));

    return { overdueAssignments: overdue, upcomingAssignments: upcoming };
  }, [assignments]);

  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Mark assignment as complete
  const handleComplete = useCallback(
    async (id: string) => {
      setUpdatingIds((prev) => new Set(prev).add(id));

      try {
        const res = await fetch(`/api/chores/assignments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed_at: new Date().toISOString(),
          }),
        });

        if (res.ok) {
          mutate();
        }
      } catch {
        // Silently fail - the UI will show the old state
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [mutate]
  );

  // Count stats
  const overdueCount = overdueAssignments.length;
  const todayCount = upcomingAssignments.filter((a) => isToday(a.due_date)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Chores</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {assignments.length === 0
                  ? 'All done!'
                  : `${assignments.length} pending${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {assignments.length > 0 && (
            <div className="mt-4 flex gap-4">
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {overdueCount} overdue
                  </span>
                </div>
              )}
              {todayCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-900/20">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {todayCount} due today
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="py-16 text-center">
            <p className="text-red-500 dark:text-red-400">Failed to load chores.</p>
            <button onClick={() => mutate()} className="mt-2 text-indigo-500 hover:text-indigo-600">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && assignments.length === 0 && <EmptyState />}

        {/* Assignments list */}
        {!isLoading && !error && assignments.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Overdue section */}
            {overdueAssignments.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-red-600 uppercase dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue
                </h2>
                <AnimatePresence mode="popLayout">
                  {overdueAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onComplete={handleComplete}
                      isUpdating={updatingIds.has(assignment.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Upcoming section */}
            {upcomingAssignments.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  {overdueAssignments.length > 0 ? 'Upcoming' : 'Your Chores'}
                </h2>
                <AnimatePresence mode="popLayout">
                  {upcomingAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onComplete={handleComplete}
                      isUpdating={updatingIds.has(assignment.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link
            href="/chores"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Back to all chores
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
