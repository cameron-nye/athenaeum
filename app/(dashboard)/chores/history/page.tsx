'use client';

/**
 * Chore completion history page.
 * REQ-5-023: Create chore completion history
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  History,
  Calendar,
  User,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Award,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

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

interface CompletedAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string;
  chores: ChoreInfo;
  users: UserInfo | null;
}

interface HouseholdMember {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
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
};

type DateFilter = '7d' | '30d' | '90d' | 'all';

function formatCompletionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function groupByDate(assignments: CompletedAssignment[]): Map<string, CompletedAssignment[]> {
  const grouped = new Map<string, CompletedAssignment[]>();

  for (const assignment of assignments) {
    const dateKey = new Date(assignment.completed_at).toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    existing.push(assignment);
    grouped.set(dateKey, existing);
  }

  return grouped;
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChoreHistoryPage() {
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');

  // Calculate date range
  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();

    switch (dateFilter) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      case 'all':
        from.setFullYear(from.getFullYear() - 10);
        break;
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  }, [dateFilter]);

  // Fetch completed assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useSWR<{
    assignments: CompletedAssignment[];
  }>(
    `/api/chores/assignments?status=completed&from=${dateRange.from}&to=${dateRange.to}`,
    fetcher,
    { revalidateOnFocus: true }
  );

  // Fetch household members
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  const members = membersData?.members ?? [];

  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    let assignments = assignmentsData?.assignments ?? [];

    if (memberFilter !== 'all') {
      assignments = assignments.filter((a) => a.assigned_to === memberFilter);
    }

    // Sort by completion date (newest first)
    return assignments.sort(
      (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );
  }, [assignmentsData?.assignments, memberFilter]);

  // Group by date for display
  const groupedAssignments = useMemo(() => groupByDate(filteredAssignments), [filteredAssignments]);

  // Calculate stats
  const stats = useMemo(() => {
    const assignments = filteredAssignments;
    const totalCompleted = assignments.length;
    const totalPoints = assignments.reduce((sum, a) => sum + (a.chores.points || 0), 0);
    return { totalCompleted, totalPoints };
  }, [filteredAssignments]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-2">
            <Link
              href="/chores"
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Completion History
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track who did what and when
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {stats.totalCompleted} completed
              </span>
            </div>
            {stats.totalPoints > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-900/20">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {stats.totalPoints} points
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap gap-3"
        >
          {/* Member filter */}
          <div className="relative">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <User className="h-3 w-3" />
              <span>By member</span>
            </div>
            <div className="relative mt-1">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className={cn(
                  'appearance-none rounded-lg border bg-white py-1.5 pr-8 pl-3 text-sm',
                  'border-gray-200 dark:border-gray-700 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                )}
              >
                <option value="all">Everyone</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.email || 'Unknown'}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Date filter */}
          <div className="relative">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>Time period</span>
            </div>
            <div className="relative mt-1">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className={cn(
                  'appearance-none rounded-lg border bg-white py-1.5 pr-8 pl-3 text-sm',
                  'border-gray-200 dark:border-gray-700 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300',
                  'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                )}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {assignmentsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Empty state */}
        {!assignmentsLoading && filteredAssignments.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <History className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              No completed chores
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {memberFilter !== 'all'
                ? 'No chores completed by this member in this time period.'
                : 'No chores have been completed in this time period.'}
            </p>
          </motion.div>
        )}

        {/* History list */}
        {!assignmentsLoading && filteredAssignments.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {Array.from(groupedAssignments.entries()).map(([dateKey, assignments]) => (
              <div key={dateKey}>
                <h3 className="mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  {formatDateHeader(dateKey)}
                </h3>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {assignments.map((assignment) => (
                      <motion.div
                        key={assignment.id}
                        variants={itemVariants}
                        layout
                        className={cn(
                          'flex items-center gap-4 rounded-xl p-4',
                          'bg-white shadow-sm dark:bg-gray-800',
                          'border border-gray-100 dark:border-gray-700'
                        )}
                      >
                        {/* Chore icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl dark:bg-green-900/20">
                          {assignment.chores.icon || '✅'}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium text-gray-900 dark:text-white">
                            {assignment.chores.title}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>{formatCompletionDate(assignment.completed_at)}</span>
                            {assignment.chores.points > 0 && (
                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                +{assignment.chores.points}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Completer */}
                        {assignment.users ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              name={assignment.users.display_name}
                              avatarUrl={assignment.users.avatar_url}
                              size="sm"
                            />
                            <span className="hidden text-sm text-gray-600 sm:inline dark:text-gray-400">
                              {assignment.users.display_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
