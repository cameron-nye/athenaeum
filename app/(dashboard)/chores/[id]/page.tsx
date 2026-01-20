'use client';

/**
 * Chore detail/edit page with assignments management.
 * REQ-5-009: Create chore edit form
 * REQ-5-010: Create chore delete functionality
 */

import { useState, useCallback, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Check,
  Loader2,
  Award,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseRRuleToText } from '@/lib/chores/recurrence';
import { RecurrenceSelector } from '@/components/chores/RecurrenceSelector';
import { IconSelector } from '@/components/chores/IconSelector';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ChoreUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ChoreAssignment {
  id: string;
  due_date: string;
  assigned_to: string | null;
  recurrence_rule: string | null;
  completed_at: string | null;
  created_at: string;
  users: ChoreUser | null;
}

interface Chore {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  points: number;
  created_at: string;
}

interface ChoreDetailData {
  chore: Chore;
  assignments: ChoreAssignment[];
}

interface HouseholdMember {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
    const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} overdue`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function ChoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<ChoreDetailData>(`/api/chores/${id}`, fetcher);

  // Fetch current user ID for claim functionality
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);
  const currentUserId = membersData?.current_user_id;

  const chore = data?.chore;
  const assignments = data?.assignments ?? [];

  // Split assignments into pending and completed
  const pendingAssignments = assignments.filter((a) => !a.completed_at);
  const completedAssignments = assignments.filter((a) => a.completed_at);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/chores');
    } catch {
      alert('Failed to delete chore');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [id, router]);

  const handleToggleComplete = useCallback(
    async (assignmentId: string, isComplete: boolean) => {
      try {
        const res = await fetch(`/api/chores/assignments/${assignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed_at: isComplete ? new Date().toISOString() : null,
          }),
        });
        if (!res.ok) throw new Error('Failed to update');
        mutate();
      } catch {
        alert('Failed to update assignment');
      }
    },
    [mutate]
  );

  // REQ-5-029: Claim unassigned chore
  const handleClaim = useCallback(
    async (assignmentId: string) => {
      if (!currentUserId) {
        alert('Unable to claim - user not loaded');
        return;
      }
      try {
        const res = await fetch(`/api/chores/assignments/${assignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assigned_to: currentUserId,
          }),
        });
        if (!res.ok) throw new Error('Failed to claim');
        mutate();
      } catch {
        alert('Failed to claim assignment');
      }
    },
    [currentUserId, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !chore) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="mb-4 text-red-500">Failed to load chore</p>
        <button
          onClick={() => router.push('/chores')}
          className="text-indigo-500 hover:text-indigo-600"
        >
          Back to Chores
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4"
        >
          <button
            onClick={() => router.push('/chores')}
            className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex flex-1 items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 text-3xl dark:from-indigo-900/30 dark:to-purple-900/30">
              {chore.icon || '✨'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-white">
                {chore.title}
              </h1>
              {chore.points > 0 && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">{chore.points} points</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Pencil className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl p-2 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-5 w-5 text-red-500" />
          </button>
        </motion.div>

        {/* Description */}
        {chore.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 text-gray-600 dark:text-gray-400"
          >
            {chore.description}
          </motion.p>
        )}

        {/* Pending Assignments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming</h2>
            <button
              onClick={() => setShowAssignModal(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm',
                'bg-indigo-50 dark:bg-indigo-900/30',
                'text-indigo-600 dark:text-indigo-400',
                'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
                'transition-colors'
              )}
            >
              <Plus className="h-4 w-4" />
              Assign
            </button>
          </div>

          {pendingAssignments.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-8 text-center dark:bg-gray-800/50">
              <p className="text-gray-500 dark:text-gray-400">No upcoming assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onToggleComplete={handleToggleComplete}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Completed Assignments */}
        {completedAssignments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Completed</h2>
            <div className="space-y-3 opacity-70">
              {completedAssignments.slice(0, 5).map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <ChoreEditModal
            chore={chore}
            onClose={() => setIsEditing(false)}
            onSaved={() => {
              setIsEditing(false);
              mutate();
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDialog
            title="Delete Chore?"
            message="This will permanently delete this chore and all its assignments. This cannot be undone."
            confirmLabel="Delete"
            isDestructive
            isLoading={isDeleting}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <AssignModal
            choreId={id}
            onClose={() => setShowAssignModal(false)}
            onCreated={() => {
              setShowAssignModal(false);
              mutate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentCard({
  assignment,
  onToggleComplete,
  onClaim,
}: {
  assignment: ChoreAssignment;
  onToggleComplete: (id: string, complete: boolean) => void;
  onClaim?: (id: string) => void;
}) {
  const isComplete = !!assignment.completed_at;
  const overdueStatus = !isComplete && isOverdue(assignment.due_date);
  const isUnassigned = !assignment.users && !assignment.assigned_to;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-4 rounded-xl p-4',
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        overdueStatus && 'border-l-4 border-l-red-500'
      )}
    >
      {/* Complete checkbox */}
      <button
        onClick={() => onToggleComplete(assignment.id, !isComplete)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border-2',
          'transition-all duration-200',
          isComplete
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-300 hover:border-green-500 dark:border-gray-600'
        )}
      >
        {isComplete && <Check className="h-4 w-4" />}
      </button>

      {/* Assignment info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'text-sm font-medium',
              isComplete
                ? 'text-gray-400 line-through'
                : overdueStatus
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
            )}
          >
            {formatDueDate(assignment.due_date)}
          </span>

          {assignment.users && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <UserAvatar
                name={assignment.users.display_name}
                avatarUrl={assignment.users.avatar_url}
                size="xs"
              />
              {assignment.users.display_name || 'Unknown'}
            </span>
          )}

          {isUnassigned && <span className="text-sm text-gray-400 italic">Anyone</span>}
        </div>

        {assignment.recurrence_rule && (
          <span className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <RefreshCw className="h-3 w-3" />
            {parseRRuleToText(assignment.recurrence_rule)}
          </span>
        )}
      </div>

      {/* Claim button for unassigned chores */}
      {isUnassigned && !isComplete && onClaim && (
        <button
          onClick={() => onClaim(assignment.id)}
          className={cn(
            'rounded-lg px-3 py-1 text-xs font-medium',
            'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
            'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
            'transition-colors'
          )}
        >
          Claim
        </button>
      )}
    </motion.div>
  );
}

function ChoreEditModal({
  chore,
  onClose,
  onSaved,
}: {
  chore: Chore;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(chore.title);
  const [description, setDescription] = useState(chore.description || '');
  const [icon, setIcon] = useState(chore.icon || '');
  const [points, setPoints] = useState(chore.points);
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
      const res = await fetch(`/api/chores/${chore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          icon: icon || null,
          points,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update chore');
      }

      onSaved();
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
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Edit Chore</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 dark:text-white'
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'resize-none text-gray-900 dark:text-white'
              )}
            />
          </div>

          <div className="flex items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Icon
              </label>
              <IconSelector value={icon || null} onChange={setIcon} />
            </div>

            <div className="flex-1">
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
            </div>
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

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
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  isDestructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          {isDestructive && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>

        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 font-medium',
              isDestructive
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-indigo-500 text-white hover:bg-indigo-600',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AssignModal({
  choreId,
  onClose,
  onCreated,
}: {
  choreId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  const members = membersData?.members ?? [];

  // Parse dueDate string into Date for RecurrenceSelector
  const startDate = useMemo(() => {
    const parsed = new Date(dueDate + 'T00:00:00');
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dueDate) {
      setError('Due date is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/chores/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chore_id: choreId,
          assigned_to: assignedTo || null,
          due_date: dueDate,
          recurrence_rule: recurrenceRule,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create assignment');
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Assign Chore</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignee */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assign to
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 dark:text-white'
              )}
            >
              <option value="">Anyone (Unassigned)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={cn(
                'w-full rounded-xl border bg-white px-4 py-2.5 dark:bg-gray-900',
                'border-gray-200 dark:border-gray-700',
                'focus:border-transparent focus:ring-2 focus:ring-indigo-500',
                'text-gray-900 dark:text-white'
              )}
            />
          </div>

          {/* Recurrence - using new component */}
          <RecurrenceSelector
            value={recurrenceRule}
            startDate={startDate}
            onChange={setRecurrenceRule}
          />

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

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
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Assignment
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
