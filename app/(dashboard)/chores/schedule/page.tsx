'use client';

/**
 * Chore schedule/chart view page.
 * REQ-5-017: Create chore chart/schedule view
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { addDays, formatDate, getStartOfWeek } from '@/lib/utils/dates';

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

interface ChoreAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

function formatWeekRange(startDate: Date): string {
  const endDate = addDays(startDate, 6);
  const startMonth = formatDate(startDate, { month: 'short' });
  const endMonth = formatDate(endDate, { month: 'short' });

  if (startMonth === endMonth) {
    return `${startDate.getDate()} - ${endDate.getDate()} ${startMonth}`;
  }
  return `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// Status colors for chore chips
function getChoreChipStyles(assignment: ChoreAssignment): string {
  if (assignment.completed_at) {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
  }
  const dueDate = new Date(assignment.due_date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dueDate < today) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  }
  return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
}

export default function ChoreSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const dateRange = useMemo(() => {
    const from = weekStart.toISOString().split('T')[0];
    const to = addDays(weekStart, 6).toISOString().split('T')[0];
    return { from, to };
  }, [weekStart]);

  // Fetch assignments for this week
  const { data: assignmentsData, isLoading: assignmentsLoading } = useSWR<{
    assignments: ChoreAssignment[];
  }>(`/api/chores/assignments?from=${dateRange.from}&to=${dateRange.to}`, fetcher, {
    revalidateOnFocus: true,
  });

  // Fetch household members
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  const members = membersData?.members ?? [];
  const assignments = assignmentsData?.assignments ?? [];

  // Group assignments by member and date
  const assignmentGrid = useMemo(() => {
    const grid = new Map<string, Map<string, ChoreAssignment[]>>();

    // Initialize grid for each member + unassigned
    const memberIds = [...members.map((m) => m.id), 'unassigned'];
    memberIds.forEach((memberId) => {
      grid.set(memberId, new Map());
    });

    // Populate grid
    for (const assignment of assignments) {
      const memberId = assignment.assigned_to || 'unassigned';
      const memberGrid = grid.get(memberId);
      if (memberGrid) {
        const existing = memberGrid.get(assignment.due_date) || [];
        existing.push(assignment);
        memberGrid.set(assignment.due_date, existing);
      }
    }

    return grid;
  }, [assignments, members]);

  const goToPrevWeek = () => {
    setWeekStart((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7));
  };

  const goToThisWeek = () => {
    setWeekStart(getStartOfWeek(new Date()));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8">
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Weekly Schedule
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  See who&apos;s doing what this week
                </p>
              </div>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevWeek}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={goToThisWeek}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                This Week
              </button>

              <button
                onClick={goToNextWeek}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Week range display */}
          <div className="mt-4 text-center">
            <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {formatWeekRange(weekStart)}
            </span>
          </div>
        </motion.div>

        {/* Loading */}
        {assignmentsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Schedule Grid */}
        {!assignmentsLoading && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
              <div className="border-r border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Member</span>
              </div>
              {weekDates.map((date, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'px-2 py-3 text-center',
                    idx < 6 && 'border-r border-gray-200 dark:border-gray-700',
                    isToday(date)
                      ? 'bg-indigo-50 dark:bg-indigo-900/20'
                      : 'bg-gray-50 dark:bg-gray-900'
                  )}
                >
                  <div className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                    {DAY_NAMES[date.getDay()]}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-semibold',
                      isToday(date)
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Member rows */}
            <AnimatePresence mode="popLayout">
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  variants={itemVariants}
                  className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 dark:border-gray-700/50"
                >
                  {/* Member info */}
                  <div className="flex items-center gap-2 border-r border-gray-200 px-3 py-3 dark:border-gray-700">
                    <UserAvatar
                      name={member.display_name}
                      avatarUrl={member.avatar_url}
                      size="sm"
                    />
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {member.display_name || member.email || 'Unknown'}
                    </span>
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const cellAssignments = assignmentGrid.get(member.id)?.get(dateStr) || [];

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'min-h-[80px] p-1.5',
                          idx < 6 && 'border-r border-gray-100 dark:border-gray-700/50',
                          isToday(date) && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          {cellAssignments.map((assignment) => (
                            <Link
                              key={assignment.id}
                              href={`/chores/${assignment.chore_id}`}
                              className={cn(
                                'flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs transition-all hover:shadow-sm',
                                getChoreChipStyles(assignment)
                              )}
                            >
                              <span className="shrink-0">{assignment.chores.icon || '📋'}</span>
                              <span className="truncate font-medium">
                                {assignment.chores.title}
                              </span>
                              {assignment.completed_at && (
                                <CheckCircle2 className="ml-auto h-3 w-3 shrink-0" />
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}

              {/* Unassigned row */}
              {(() => {
                const unassignedGrid = assignmentGrid.get('unassigned');
                const hasUnassigned =
                  unassignedGrid &&
                  Array.from(unassignedGrid.values()).some((arr) => arr.length > 0);

                if (!hasUnassigned) return null;

                return (
                  <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 dark:border-gray-700/50"
                  >
                    {/* Unassigned label */}
                    <div className="flex items-center gap-2 border-r border-gray-200 px-3 py-3 dark:border-gray-700">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="truncate text-sm font-medium text-gray-500 italic dark:text-gray-400">
                        Unassigned
                      </span>
                    </div>

                    {/* Day cells for unassigned */}
                    {weekDates.map((date, idx) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const cellAssignments = unassignedGrid?.get(dateStr) || [];

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'min-h-[80px] p-1.5',
                            idx < 6 && 'border-r border-gray-100 dark:border-gray-700/50',
                            isToday(date) && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            {cellAssignments.map((assignment) => (
                              <Link
                                key={assignment.id}
                                href={`/chores/${assignment.chore_id}`}
                                className={cn(
                                  'flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs transition-all hover:shadow-sm',
                                  getChoreChipStyles(assignment)
                                )}
                              >
                                <span className="shrink-0">{assignment.chores.icon || '📋'}</span>
                                <span className="truncate font-medium">
                                  {assignment.chores.title}
                                </span>
                                {assignment.completed_at && (
                                  <CheckCircle2 className="ml-auto h-3 w-3 shrink-0" />
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Empty state when no members */}
            {members.length === 0 && !assignmentsLoading && (
              <div className="py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400">No household members found.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm"
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-indigo-500" />
            <span className="text-gray-600 dark:text-gray-400">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Overdue</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
