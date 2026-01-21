/**
 * Tests for ChoreCard component
 * Phase 4: Core Components - Chore Card
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoreCard } from './ChoreCard';
import type { Chore } from '@/lib/types/chore';
import type { FamilyMember } from '@/lib/types/family';

const mockMember: FamilyMember = {
  id: '1',
  name: 'John Doe',
  avatarUrl: null,
  color: '#3b82f6',
};

const baseChore: Chore = {
  id: 'chore-1',
  title: 'Take out the trash',
  assignee: mockMember,
  dueDate: new Date(),
  completed: false,
};

describe('ChoreCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders chore title', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} />);
      expect(screen.getByText('Take out the trash')).toBeInTheDocument();
    });

    it('renders assignee avatar', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders due date as Today', () => {
      const handleComplete = vi.fn();
      const todayChore = { ...baseChore, dueDate: new Date('2026-01-15') };
      render(<ChoreCard chore={todayChore} onComplete={handleComplete} />);
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('renders due date as Tomorrow', () => {
      const handleComplete = vi.fn();
      const tomorrowChore = { ...baseChore, dueDate: new Date('2026-01-16') };
      render(<ChoreCard chore={tomorrowChore} onComplete={handleComplete} />);
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('renders recurring badge when chore is recurring', () => {
      const handleComplete = vi.fn();
      const recurringChore = { ...baseChore, recurring: 'Weekly' };
      render(<ChoreCard chore={recurringChore} onComplete={handleComplete} />);
      expect(screen.getByText('Weekly')).toBeInTheDocument();
    });

    it('does not render recurring badge when not recurring', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} />);
      expect(screen.queryByText('Weekly')).not.toBeInTheDocument();
    });
  });

  describe('completion state', () => {
    it('applies completed styling when chore is completed', () => {
      const handleComplete = vi.fn();
      const completedChore = { ...baseChore, completed: true };
      const { container } = render(
        <ChoreCard chore={completedChore} onComplete={handleComplete} />
      );

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('opacity-60');
    });

    it('applies line-through to title when completed', () => {
      const handleComplete = vi.fn();
      const completedChore = { ...baseChore, completed: true };
      render(<ChoreCard chore={completedChore} onComplete={handleComplete} />);

      const title = screen.getByText('Take out the trash');
      expect(title).toHaveClass('line-through');
    });

    it('renders secondary button variant when completed', () => {
      const handleComplete = vi.fn();
      const completedChore = { ...baseChore, completed: true };
      render(<ChoreCard chore={completedChore} onComplete={handleComplete} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
    });
  });

  describe('overdue state', () => {
    it('applies destructive border when overdue', () => {
      const handleComplete = vi.fn();
      const overdueChore = { ...baseChore, dueDate: new Date('2026-01-10') };
      const { container } = render(<ChoreCard chore={overdueChore} onComplete={handleComplete} />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toHaveClass('border-destructive/50');
    });

    it('applies destructive text color to due date when overdue', () => {
      const handleComplete = vi.fn();
      const overdueChore = { ...baseChore, dueDate: new Date('2026-01-10') };
      render(<ChoreCard chore={overdueChore} onComplete={handleComplete} />);

      // The date should show "Yesterday" or a formatted date
      const dateText = screen.getByText(/Jan|Yesterday/);
      expect(dateText).toHaveClass('text-destructive');
    });

    it('does not show overdue styling when completed', () => {
      const handleComplete = vi.fn();
      const completedOverdueChore = {
        ...baseChore,
        dueDate: new Date('2026-01-10'),
        completed: true,
      };
      const { container } = render(
        <ChoreCard chore={completedOverdueChore} onComplete={handleComplete} />
      );

      const card = container.querySelector('[data-slot="card"]');
      expect(card).not.toHaveClass('border-destructive/50');
    });
  });

  describe('interaction', () => {
    it('calls onComplete with chore id when button is clicked', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleComplete).toHaveBeenCalledWith('chore-1');
      expect(handleComplete).toHaveBeenCalledTimes(1);
    });

    it('disables button when isUpdating is true', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} isUpdating />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('button is enabled when isUpdating is false', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} isUpdating={false} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label for incomplete chore', () => {
      const handleComplete = vi.fn();
      render(<ChoreCard chore={baseChore} onComplete={handleComplete} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Mark as complete');
    });

    it('has correct aria-label for completed chore', () => {
      const handleComplete = vi.fn();
      const completedChore = { ...baseChore, completed: true };
      render(<ChoreCard chore={completedChore} onComplete={handleComplete} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Mark as incomplete');
    });
  });
});
