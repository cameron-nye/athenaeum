/**
 * Shared type definitions for chores.
 * Used across components for consistent typing.
 */

import type { FamilyMember } from './family';

/**
 * Represents a chore for display components.
 * Used by ChoreCard and other chore-related components.
 */
export interface Chore {
  id: string;
  title: string;
  assignee: FamilyMember;
  dueDate: Date;
  completed: boolean;
  recurring?: string;
}

/**
 * Represents a chore from the API with related data.
 */
export interface ChoreWithAssignment {
  id: string;
  title: string;
  icon: string | null;
  points: number;
  assignment: {
    id: string;
    due_date: string;
    completed_at: string | null;
    recurrence_rule: string | null;
  };
  assignee: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

/**
 * Format a due date for display (e.g., "Today", "Tomorrow", "Mon, Jan 15")
 */
export function formatDueDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) {
    return 'Today';
  }

  if (compareDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  if (compareDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Check if within next 7 days - show day name
  const daysUntil = Math.floor((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil > 0 && daysUntil <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Otherwise show short date
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a chore is overdue
 */
export function isChoreOverdue(dueDate: Date, completed: boolean): boolean {
  if (completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(dueDate);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate < today;
}
