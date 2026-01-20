'use client';

/**
 * AssignmentsView component showing all chore assignments.
 * REQ-5-014: Create assignments list view
 * - Shows upcoming assignments by due date
 * - Groups by day or week
 * - Filter by family member
 * - Filter by date range
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  Calendar,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  User,
  Users,
  X,
  CalendarDays,
} from 'lucide-react';
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

interface HouseholdMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

type GroupBy = 'day' | 'week';
type DateRange = 'today' | 'week' | 'month' | 'all';

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

const groupVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
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

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatGroupHeader(dateStr: string, groupBy: GroupBy): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (groupBy === 'day') {
    return formatDueDate(dateStr);
  }

  // Week grouping - show range
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Check if current week
  const todayWeekStart = new Date(today);
  todayWeekStart.setDate(todayWeekStart.getDate() - todayWeekStart.getDay());
  if (weekStart.getTime() === todayWeekStart.getTime()) {
    return 'This Week';
  }

  const nextWeekStart = new Date(todayWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  if (weekStart.getTime() === nextWeekStart.getTime()) {
    return 'Next Week';
  }

  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getDateRangeParams(range: DateRange): { from?: string; to?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (range) {
    case 'today':
      return { from: formatDate(today), to: formatDate(today) };
    case 'week': {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return { from: formatDate(today), to: formatDate(weekEnd) };
    }
    case 'month': {
      const monthEnd = new Date(today);
      monthEnd.setDate(monthEnd.getDate() + 30);
      return { from: formatDate(today), to: formatDate(monthEnd) };
    }
    case 'all':
    default:
      return {};
  }
}

function isOverdue(dateStr: string, completedAt: string | null): boolean {
  if (completedAt) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart.toISOString().split('T')[0];
}

function groupAssignments(assignments: Assignment[], groupBy: GroupBy): Map<string, Assignment[]> {
  const groups = new Map<string, Assignment[]>();

  for (const assignment of assignments) {
    const key = groupBy === 'day' ? assignment.due_date : getWeekKey(assignment.due_date);
    const existing = groups.get(key) || [];
    existing.push(assignment);
    groups.set(key, existing);
  }

  return groups;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onToggleComplete: (id: string, completed: boolean) => void;
  isUpdating: boolean;
}

function AssignmentCard({ assignment, onToggleComplete, isUpdating }: AssignmentCardProps) {
  const isCompleted = !!assignment.completed_at;
  const overdue = isOverdue(assignment.due_date, assignment.completed_at);

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={cn(
        'group relative flex items-center gap-4 rounded-xl p-4',
        'bg-white shadow-sm dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        'transition-all duration-200',
        overdue && 'border-l-4 border-l-red-500',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Completion checkbox */}
      <button
        onClick={() => onToggleComplete(assignment.id, !isCompleted)}
        disabled={isUpdating}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
          'transition-all duration-200',
          isCompleted
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 hover:border-indigo-500 dark:border-gray-600'
        )}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isCompleted ? (
          <Check className="h-3 w-3" />
        ) : null}
      </button>

      {/* Chore icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl',
          'bg-gray-50 dark:bg-gray-700',
          isCompleted && 'grayscale'
        )}
      >
        {assignment.chores.icon || '✨'}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h4
          className={cn(
            'truncate font-medium text-gray-900 dark:text-white',
            isCompleted && 'line-through'
          )}
        >
          {assignment.chores.title}
        </h4>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <span
            className={cn(
              'flex items-center gap-1',
              overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            {formatDueDate(assignment.due_date)}
          </span>
        </div>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2">
        {assignment.users ? (
          <UserAvatar
            name={assignment.users.display_name || 'User'}
            avatarUrl={assignment.users.avatar_url}
            size="sm"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            <Users className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Points badge */}
      {assignment.chores.points > 0 && (
        <div className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          {assignment.chores.points} pts
        </div>
      )}
    </motion.div>
  );
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

function FilterDropdown({ label, value, options, onChange, icon }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
          'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'transition-colors duration-200'
        )}
      >
        {icon}
        <span className="text-gray-600 dark:text-gray-400">{label}:</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {selectedOption?.label || value}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 z-20 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg',
                'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              )}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    option.value === value && 'bg-indigo-50 dark:bg-indigo-900/30'
                  )}
                >
                  {option.value === value && <Check className="h-4 w-4 text-indigo-500" />}
                  <span
                    className={cn(
                      option.value === value
                        ? 'font-medium text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300',
                      option.value !== value && 'ml-6'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AssignmentsView() {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Fetch household members for filter
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    const dateParams = getDateRangeParams(dateRange);

    if (dateParams.from) params.set('from', dateParams.from);
    if (dateParams.to) params.set('to', dateParams.to);
    if (memberFilter !== 'all') params.set('user_id', memberFilter);
    params.set('status', showCompleted ? 'all' : 'pending');

    return `/api/chores/assignments?${params.toString()}`;
  }, [dateRange, memberFilter, showCompleted]);

  // Fetch assignments
  const {
    data: assignmentsData,
    error,
    isLoading,
    mutate,
  } = useSWR<{ assignments: Assignment[] }>(apiUrl, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
  });

  // Memoize assignments array to prevent recreation on each render
  const assignments = useMemo(
    () => assignmentsData?.assignments ?? [],
    [assignmentsData?.assignments]
  );

  // Group assignments
  const groupedAssignments = useMemo(() => {
    return groupAssignments(assignments, groupBy);
  }, [assignments, groupBy]);

  // Sort group keys (dates)
  const sortedGroupKeys = useMemo(() => {
    return Array.from(groupedAssignments.keys()).sort((a, b) => a.localeCompare(b));
  }, [groupedAssignments]);

  // Toggle completion handler
  const handleToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      setUpdatingIds((prev) => new Set(prev).add(id));

      try {
        const res = await fetch(`/api/chores/assignments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed_at: completed ? new Date().toISOString() : null,
          }),
        });

        if (res.ok) {
          mutate();
        }
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

  // Build member filter options
  const memberOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Everyone' }];

    if (membersData?.current_user_id) {
      options.push({ value: 'me', label: 'My Chores' });
    }

    if (membersData?.members) {
      for (const member of membersData.members) {
        if (member.id !== membersData.current_user_id) {
          options.push({
            value: member.id,
            label: member.display_name || member.email,
          });
        }
      }
    }

    options.push({ value: 'unassigned', label: 'Unassigned' });

    return options;
  }, [membersData]);

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Next 7 Days' },
    { value: 'month', label: 'Next 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const groupByOptions = [
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          label="Show"
          value={memberFilter}
          options={memberOptions}
          onChange={setMemberFilter}
          icon={<User className="h-4 w-4 text-gray-400" />}
        />

        <FilterDropdown
          label="Period"
          value={dateRange}
          options={dateRangeOptions}
          onChange={(v) => setDateRange(v as DateRange)}
          icon={<CalendarDays className="h-4 w-4 text-gray-400" />}
        />

        <FilterDropdown
          label="Group"
          value={groupBy}
          options={groupByOptions}
          onChange={(v) => setGroupBy(v as GroupBy)}
          icon={<Filter className="h-4 w-4 text-gray-400" />}
        />

        {/* Show completed toggle */}
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
            'transition-colors duration-200',
            showCompleted
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600'
          )}
        >
          <Check className="h-4 w-4" />
          Show Completed
        </button>

        {/* Clear filters */}
        {(memberFilter !== 'all' || dateRange !== 'month' || showCompleted) && (
          <button
            onClick={() => {
              setMemberFilter('all');
              setDateRange('month');
              setShowCompleted(false);
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-12 text-center">
          <p className="text-red-500 dark:text-red-400">Failed to load assignments.</p>
          <button onClick={() => mutate()} className="mt-2 text-indigo-500 hover:text-indigo-600">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && assignments.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No assignments found
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {memberFilter !== 'all'
              ? 'Try selecting a different filter.'
              : 'Assign chores to family members to see them here.'}
          </p>
        </motion.div>
      )}

      {/* Grouped assignments */}
      {!isLoading && !error && assignments.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {sortedGroupKeys.map((groupKey) => {
            const groupAssignments = groupedAssignments.get(groupKey) || [];

            return (
              <motion.div key={groupKey} variants={groupVariants} className="space-y-3">
                {/* Group header */}
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  {formatGroupHeader(groupKey, groupBy)}
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {groupAssignments.length}
                  </span>
                </h3>

                {/* Assignment cards */}
                <AnimatePresence mode="popLayout">
                  {groupAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      onToggleComplete={handleToggleComplete}
                      isUpdating={updatingIds.has(assignment.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
