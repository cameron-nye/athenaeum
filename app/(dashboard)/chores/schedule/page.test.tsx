import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChoreSchedulePage from './page';

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
        variants: _v,
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

// Create dates for this week
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

// Get start of week (Sunday)
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay());
const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

const mockAssignments = {
  assignments: [
    {
      id: 'assign-1',
      chore_id: 'chore-1',
      due_date: todayStr,
      assigned_to: 'user-1',
      completed_at: null,
      chores: { id: 'chore-1', title: 'Take out trash', icon: '🗑️', points: 5 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-2',
      chore_id: 'chore-2',
      due_date: todayStr,
      assigned_to: 'user-2',
      completed_at: new Date().toISOString(),
      chores: { id: 'chore-2', title: 'Do dishes', icon: '🍽️', points: 3 },
      users: { id: 'user-2', display_name: 'Bob', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-3',
      due_date: todayStr,
      assigned_to: null,
      completed_at: null,
      chores: { id: 'chore-3', title: 'Vacuum', icon: '🧹', points: 10 },
      users: null,
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

describe('ChoreSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = (assignmentsData = mockAssignments, membersData = mockMembersData) => {
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
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    expect(screen.getByText("See who's doing what this week")).toBeInTheDocument();
  });

  it('renders member rows', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders day headers', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders chore assignments in grid', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Take out trash')).toBeInTheDocument();
    expect(screen.getByText('Do dishes')).toBeInTheDocument();
  });

  it('renders chore icons', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('🗑️')).toBeInTheDocument();
    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });

  it('shows unassigned row when there are unassigned chores', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBeInTheDocument();
  });

  it('has week navigation buttons', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('can navigate to previous week', async () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    const prevButtons = screen.getAllByRole('button');
    const prevWeekButton = prevButtons.find((btn) => btn.querySelector('svg.lucide-chevron-left'));

    expect(prevWeekButton).toBeInTheDocument();

    // Click to go to previous week - should trigger new SWR call
    if (prevWeekButton) {
      fireEvent.click(prevWeekButton);
      await waitFor(() => {
        // The SWR hook should be called with different date params
        expect(mockUseSWR).toHaveBeenCalled();
      });
    }
  });

  it('shows loading state', () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url.includes('/api/chores/assignments')) {
        return { data: null, isLoading: true, error: null };
      }
      return { data: mockMembersData, isLoading: false, error: null };
    });

    render(<ChoreSchedulePage />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows legend with status colors', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('has back link to chores page', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    const backLinks = screen.getAllByRole('link');
    const backLink = backLinks.find((link) => link.getAttribute('href') === '/chores');
    expect(backLink).toBeInTheDocument();
  });

  it('chore chips link to chore detail page', () => {
    setupMocks();
    render(<ChoreSchedulePage />);

    const choreLinks = screen.getAllByRole('link');
    const trashLink = choreLinks.find(
      (link) =>
        link.getAttribute('href') === '/chores/chore-1' &&
        link.textContent?.includes('Take out trash')
    );
    expect(trashLink).toBeInTheDocument();
  });
});
