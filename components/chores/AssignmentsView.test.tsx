import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignmentsView } from './AssignmentsView';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import useSWR from 'swr';

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

const mockMembers = {
  members: [
    { id: 'user-1', display_name: 'Alice', avatar_url: null, email: 'alice@example.com' },
    { id: 'user-2', display_name: 'Bob', avatar_url: null, email: 'bob@example.com' },
  ],
  current_user_id: 'user-1',
};

const mockAssignments = {
  assignments: [
    {
      id: 'assign-1',
      chore_id: 'chore-1',
      due_date: new Date().toISOString().split('T')[0], // Today
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      chores: { id: 'chore-1', title: 'Take out trash', icon: '🗑️', points: 5 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-2',
      chore_id: 'chore-2',
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      assigned_to: 'user-2',
      recurrence_rule: 'FREQ=WEEKLY',
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      chores: { id: 'chore-2', title: 'Do dishes', icon: '🍽️', points: 3 },
      users: { id: 'user-2', display_name: 'Bob', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-3',
      due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (overdue)
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      chores: { id: 'chore-3', title: 'Vacuum', icon: '🧹', points: 10 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
  ],
};

describe('AssignmentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: null, isLoading: true };
    });

    render(<AssignmentsView />);

    // Should show loading spinner (svg element)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: null, error: new Error('Failed'), mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    expect(screen.getByText(/failed to load assignments/i)).toBeInTheDocument();
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  it('renders empty state when no assignments', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: { assignments: [] }, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    expect(screen.getByText(/no assignments found/i)).toBeInTheDocument();
  });

  it('renders assignments grouped by day', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Should show assignment titles
    expect(screen.getByText('Take out trash')).toBeInTheDocument();
    expect(screen.getByText('Do dishes')).toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBeInTheDocument();

    // Should show date labels (Today, Tomorrow, Yesterday) - use getAllByText since they appear multiple times
    // (once in group header and once in each assignment card)
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tomorrow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Yesterday').length).toBeGreaterThanOrEqual(1);
  });

  it('shows points badge for assignments with points', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    expect(screen.getByText('5 pts')).toBeInTheDocument();
    expect(screen.getByText('3 pts')).toBeInTheDocument();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
  });

  it('renders filter dropdowns', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Check filter labels
    expect(screen.getByText('Show:')).toBeInTheDocument();
    expect(screen.getByText('Period:')).toBeInTheDocument();
    expect(screen.getByText('Group:')).toBeInTheDocument();

    // Check default values
    expect(screen.getByText('Everyone')).toBeInTheDocument();
    expect(screen.getByText('Next 30 Days')).toBeInTheDocument();
    expect(screen.getByText('By Day')).toBeInTheDocument();
  });

  it('can toggle show completed filter', async () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    const showCompletedButton = screen.getByText('Show Completed').closest('button');
    expect(showCompletedButton).toBeInTheDocument();

    fireEvent.click(showCompletedButton!);

    // After clicking, the button should have different styling (indicated by class change)
    await waitFor(() => {
      expect(showCompletedButton).toHaveClass('bg-indigo-50');
    });
  });

  it('renders member filter dropdown with options', async () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Click on the "Show" filter to open dropdown
    const showFilterButton = screen.getByText('Everyone').closest('button');
    fireEvent.click(showFilterButton!);

    // Should show filter options
    await waitFor(() => {
      expect(screen.getByText('My Chores')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument(); // Other member
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });

  it('can switch grouping between day and week', async () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Click on the "Group" filter to open dropdown
    const groupFilterButton = screen.getByText('By Day').closest('button');
    fireEvent.click(groupFilterButton!);

    // Select "By Week"
    await waitFor(() => {
      expect(screen.getByText('By Week')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('By Week'));

    // Now should show "By Week" as selected
    await waitFor(() => {
      expect(screen.getByText('By Week')).toBeInTheDocument();
      // Should show "This Week" instead of individual days
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });
  });

  it('shows clear filters button when filters are applied', async () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Toggle show completed to apply a filter
    const showCompletedButton = screen.getByText('Show Completed').closest('button');
    fireEvent.click(showCompletedButton!);

    // Should now show clear filters button
    await waitFor(() => {
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });
  });

  it('displays chore icons', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Check for emoji icons
    expect(screen.getByText('🗑️')).toBeInTheDocument();
    expect(screen.getByText('🍽️')).toBeInTheDocument();
    expect(screen.getByText('🧹')).toBeInTheDocument();
  });

  it('renders completion checkboxes', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url === '/api/household/members') {
        return { data: mockMembers };
      }
      return { data: mockAssignments, isLoading: false, mutate: vi.fn() };
    });

    render(<AssignmentsView />);

    // Should have 3 completion checkbox buttons
    const checkboxButtons = document.querySelectorAll('button.rounded-full.border-2');
    expect(checkboxButtons.length).toBe(3);
  });
});
