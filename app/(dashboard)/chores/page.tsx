'use client';

/**
 * Chores dashboard page showing all household chores.
 * REQ-5-007: Create chores dashboard page
 * REQ-5-014: Create assignments list view (tab toggle)
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  ClipboardList,
  Plus,
  User,
  Calendar,
  Award,
  ChevronRight,
  Loader2,
  Sparkles,
  ListTodo,
  LayoutGrid,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconSelector } from '@/components/chores/IconSelector';
import { AssignmentsView } from '@/components/chores/AssignmentsView';

interface ChoreAssignment {
  id: string;
  due_date: string;
  assigned_to: string | null;
  assignee_name?: string;
  completed_at: string | null;
}

interface Chore {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  points: number;
  created_at: string;
  next_assignment?: ChoreAssignment | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  if (date < today) {
    return 'Overdue';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isDueOverdue(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function ChoreCard({ chore, onClick }: { chore: Chore; onClick: () => void }) {
  const hasNextAssignment = chore.next_assignment !== null;
  const isOverdue = hasNextAssignment && isDueOverdue(chore.next_assignment!.due_date);

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={cn(
        'group relative rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        'hover:border-gray-200 hover:shadow-lg dark:hover:border-gray-600',
        'cursor-pointer transition-all duration-300',
        isOverdue && 'border-l-4 border-l-red-500'
      )}
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
            'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30',
            'transition-transform duration-300 group-hover:scale-110'
          )}
        >
          {chore.icon || '✨'}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">{chore.title}</h3>

          {chore.description && (
            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
              {chore.description}
            </p>
          )}

          {/* Assignment info */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            {hasNextAssignment && (
              <>
                <div
                  className={cn(
                    'flex items-center gap-1.5',
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{formatDueDate(chore.next_assignment!.due_date)}</span>
                </div>

                {chore.next_assignment!.assignee_name && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="max-w-24 truncate">
                      {chore.next_assignment!.assignee_name}
                    </span>
                  </div>
                )}
              </>
            )}

            {!hasNextAssignment && (
              <span className="text-gray-400 italic dark:text-gray-500">
                No upcoming assignment
              </span>
            )}
          </div>
        </div>

        {/* Points badge */}
        {chore.points > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Award className="h-4 w-4" />
            <span>{chore.points}</span>
          </div>
        )}

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-gray-400 dark:text-gray-600 dark:group-hover:text-gray-500" />
      </div>
    </motion.div>
  );
}

function EmptyState({ onAddChore }: { onAddChore: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center px-4 py-16"
    >
      <motion.div
        variants={floatVariants}
        initial="initial"
        animate="animate"
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40"
      >
        <Sparkles className="h-12 w-12 text-indigo-500 dark:text-indigo-400" />
      </motion.div>

      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">No chores yet</h3>
      <p className="mb-8 max-w-sm text-center text-gray-500 dark:text-gray-400">
        Get started by creating your first chore. Assign tasks to family members and track
        completion.
      </p>

      <button
        onClick={onAddChore}
        className={cn(
          'flex items-center gap-2 rounded-xl px-6 py-3',
          'bg-gradient-to-r from-indigo-500 to-purple-500',
          'hover:from-indigo-600 hover:to-purple-600',
          'font-medium text-white shadow-lg shadow-indigo-500/25',
          'transition-all duration-300 hover:scale-105'
        )}
      >
        <Plus className="h-5 w-5" />
        Create First Chore
      </button>

      <div className="mt-8 text-sm text-gray-400 dark:text-gray-500">
        <p className="mb-2 font-medium">Suggestions to get started:</p>
        <ul className="space-y-1">
          <li>🧹 Take out the trash</li>
          <li>🍽️ Do the dishes</li>
          <li>🛏️ Make your bed</li>
          <li>🐕 Walk the dog</li>
        </ul>
      </div>
    </motion.div>
  );
}

type ViewTab = 'chores' | 'assignments';

export default function ChoresPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('chores');

  const { data, error, isLoading, mutate } = useSWR<{ chores: Chore[] }>('/api/chores', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000, // Refresh every 30s
  });

  const chores = data?.chores ?? [];

  const handleAddChore = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleChoreClick = useCallback(
    (choreId: string) => {
      router.push(`/chores/${choreId}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chores</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {chores.length} {chores.length === 1 ? 'chore' : 'chores'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chores/my"
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5',
                'border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30',
                'text-indigo-700 dark:text-indigo-300',
                'font-medium',
                'transition-all duration-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
              )}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="hidden sm:inline">My Chores</span>
            </Link>
            <button
              onClick={handleAddChore}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'hover:from-indigo-600 hover:to-purple-600',
                'font-medium text-white shadow-md shadow-indigo-500/25',
                'transition-all duration-300 hover:scale-105'
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Chore</span>
            </button>
          </div>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('chores')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                'transition-all duration-200',
                activeTab === 'chores'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Chores
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                'transition-all duration-200',
                activeTab === 'assignments'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              <ListTodo className="h-4 w-4" />
              Assignments
            </button>
          </div>
        </motion.div>

        {/* Content based on active tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'chores' ? (
            <motion.div
              key="chores-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="py-16 text-center">
                  <p className="text-red-500 dark:text-red-400">
                    Failed to load chores. Please try again.
                  </p>
                  <button
                    onClick={() => mutate()}
                    className="mt-4 text-indigo-500 hover:text-indigo-600"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !error && chores.length === 0 && (
                <EmptyState onAddChore={handleAddChore} />
              )}

              {/* Chores list */}
              {!isLoading && !error && chores.length > 0 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {chores.map((chore) => (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        onClick={() => handleChoreClick(chore.id)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="assignments-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AssignmentsView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create chore modal */}
      <AnimatePresence>
        {showCreateModal && (
          <ChoreCreateModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              mutate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Modal for creating a new chore
 * REQ-5-008: Create chore creation form
 */
function ChoreCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [points, setPoints] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          icon: icon || undefined,
          points: points || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create chore');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
          Create New Chore
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Take out the trash"
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 placeholder-gray-400 dark:text-white'
              )}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this chore"
              rows={3}
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 placeholder-gray-400 dark:text-white',
                'resize-none'
              )}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Icon
            </label>
            <IconSelector value={icon || null} onChange={setIcon} />
          </div>

          {/* Points */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Points
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              className={cn(
                'w-24 rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 dark:text-white'
              )}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reward points for completing this chore
            </p>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'hover:from-indigo-600 hover:to-purple-600',
                'font-medium text-white',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-all duration-300'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Chore
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
