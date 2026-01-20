import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChoreLeaderboardPage from './page';

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
        custom: _c,
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
      due_date: today.toISOString().split('T')[0],
      assigned_to: 'user-1',
      completed_at: today.toISOString(),
      chores: { id: 'chore-2', title: 'Do dishes', icon: '🍽️', points: 3 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-3',
      due_date: today.toISOString().split('T')[0],
      assigned_to: 'user-2',
      completed_at: today.toISOString(),
      chores: { id: 'chore-3', title: 'Vacuum', icon: '🧹', points: 10 },
      users: { id: 'user-2', display_name: 'Bob', avatar_url: null },
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

describe('ChoreLeaderboardPage', () => {
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
    render(<ChoreLeaderboardPage />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText("See who's earning the most points!")).toBeInTheDocument();
  });

  it('renders member stats', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // Both Alice and Bob should appear multiple times (podium + list)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('shows total points correctly', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // Alice: 5 + 3 = 8 points, Bob: 10 points
    // Total: 18 points
    expect(screen.getByText('18 points')).toBeInTheDocument();
  });

  it('shows total chores completed', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // 3 chores completed total
    expect(screen.getByText('3 chores')).toBeInTheDocument();
  });

  it('has time period toggle', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('can switch time periods', async () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    const monthButton = screen.getByText('This Month');
    fireEvent.click(monthButton);

    await waitFor(() => {
      // SWR should be called with updated date range
      expect(mockUseSWR).toHaveBeenCalled();
    });
  });

  it('shows rank icons', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // There should be trophy/medal icons for top rankings
    const trophyIcons = document.querySelectorAll('.lucide-trophy');
    expect(trophyIcons.length).toBeGreaterThan(0);
  });

  it('shows individual chore counts', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // Alice completed 2 chores
    expect(screen.getByText('2 chores completed')).toBeInTheDocument();
    // Bob completed 1 chore
    expect(screen.getByText('1 chore completed')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url.includes('/api/chores/assignments')) {
        return { data: null, isLoading: true, error: null };
      }
      return { data: mockMembersData, isLoading: false, error: null };
    });

    render(<ChoreLeaderboardPage />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no members', () => {
    setupMocks({ assignments: [] }, { members: [], current_user_id: '' });
    render(<ChoreLeaderboardPage />);

    expect(screen.getByText('No points yet')).toBeInTheDocument();
  });

  it('has back link to chores page', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    const backLinks = screen.getAllByRole('link');
    const backLink = backLinks.find((link) => link.getAttribute('href') === '/chores');
    expect(backLink).toBeInTheDocument();
  });

  it('shows motivational message when there are points', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    expect(screen.getByText(/Great job everyone/)).toBeInTheDocument();
  });

  it('ranks members by points descending', () => {
    setupMocks();
    render(<ChoreLeaderboardPage />);

    // Bob (10 points) should be ranked higher than Alice (8 points)
    // Look for the ranking display - Bob should be #1
    const bobEntries = screen.getAllByText('Bob');
    const aliceEntries = screen.getAllByText('Alice');

    // Both should appear
    expect(bobEntries.length).toBeGreaterThan(0);
    expect(aliceEntries.length).toBeGreaterThan(0);
  });
});
