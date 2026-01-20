import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChoreHistoryPage from './page';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial: _i,
        animate: _a,
        exit: _e,
        transition: _t,
        layout: _l,
        variants: _v,
        whileHover: _wh,
        ...domProps
      } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock UserAvatar
vi.mock('@/components/ui/UserAvatar', () => ({
  UserAvatar: ({ name }: { name: string | null }) => (
    <span data-testid="user-avatar">{name?.charAt(0) || '?'}</span>
  ),
}));

import useSWR from 'swr';

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const mockCompletedAssignments = {
  assignments: [
    {
      id: 'assign-1',
      chore_id: 'chore-1',
      due_date: today.toISOString().split('T')[0],
      assigned_to: 'user-1',
      completed_at: today.toISOString(),
      chores: { id: 'chore-1', title: 'Take out trash', icon: '🗑️', points: 5 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-2',
      chore_id: 'chore-2',
      due_date: yesterday.toISOString().split('T')[0],
      assigned_to: 'user-2',
      completed_at: yesterday.toISOString(),
      chores: { id: 'chore-2', title: 'Do dishes', icon: '🍽️', points: 3 },
      users: { id: 'user-2', display_name: 'Bob', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-3',
      due_date: yesterday.toISOString().split('T')[0],
      assigned_to: 'user-1',
      completed_at: yesterday.toISOString(),
      chores: { id: 'chore-3', title: 'Vacuum', icon: '🧹', points: 10 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
  ],
};

const mockMembersData = {
  members: [
    { id: 'user-1', display_name: 'Alice', email: 'alice@example.com', avatar_url: null },
    { id: 'user-2', display_name: 'Bob', email: 'bob@example.com', avatar_url: null },
  ],
  current_user_id: 'user-1',
};

describe('ChoreHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = (
    assignmentsData = mockCompletedAssignments,
    membersData = mockMembersData
  ) => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url.includes('/api/household/members')) {
        return {
          data: membersData,
          isLoading: false,
          error: null,
        };
      }
      if (url.includes('/api/chores/assignments')) {
        return {
          data: assignmentsData,
          isLoading: false,
          error: null,
        };
      }
      return { data: null, isLoading: false, error: null };
    });
  };

  it('renders page title', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('Completion History')).toBeInTheDocument();
    expect(screen.getByText('Track who did what and when')).toBeInTheDocument();
  });

  it('renders completed assignments', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('Take out trash')).toBeInTheDocument();
    expect(screen.getByText('Do dishes')).toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBeInTheDocument();
  });

  it('shows stats badges', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('3 completed')).toBeInTheDocument();
    expect(screen.getByText('18 points')).toBeInTheDocument(); // 5 + 3 + 10
  });

  it('groups assignments by date', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('shows chore icons', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('🗑️')).toBeInTheDocument();
    expect(screen.getByText('🍽️')).toBeInTheDocument();
    expect(screen.getByText('🧹')).toBeInTheDocument();
  });

  it('shows points badges on assignments', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('has member filter dropdown', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    // There are two selects (member filter and date filter), get the member one via getAllByRole
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });

  it('filters by member when selected', async () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    // Find the member select
    const selects = screen.getAllByRole('combobox');
    const memberSelect = selects[0];

    // Filter by Alice
    fireEvent.change(memberSelect, { target: { value: 'user-1' } });

    await waitFor(() => {
      // Alice's chores should be visible
      expect(screen.getByText('Take out trash')).toBeInTheDocument();
      expect(screen.getByText('Vacuum')).toBeInTheDocument();
      // Bob's chore should be filtered out
      expect(screen.queryByText('Do dishes')).not.toBeInTheDocument();
    });
  });

  it('has date range filter dropdown', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url.includes('/api/chores/assignments')) {
        return { data: null, isLoading: true, error: null };
      }
      return { data: mockMembersData, isLoading: false, error: null };
    });

    render(<ChoreHistoryPage />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no completions', () => {
    setupMocks({ assignments: [] });
    render(<ChoreHistoryPage />);

    expect(screen.getByText('No completed chores')).toBeInTheDocument();
  });

  it('has back link to chores page', () => {
    setupMocks();
    render(<ChoreHistoryPage />);

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute('href', '/chores');
  });
});
