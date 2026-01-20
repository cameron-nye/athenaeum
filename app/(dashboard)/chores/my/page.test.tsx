import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyChoresPage from './page';

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

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import useSWR from 'swr';

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const mockAssignments = {
  assignments: [
    {
      id: 'assign-1',
      chore_id: 'chore-1',
      due_date: today,
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
      due_date: yesterday, // Overdue
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      chores: { id: 'chore-2', title: 'Do dishes', icon: '🍽️', points: 3 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-3',
      due_date: tomorrow,
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      chores: { id: 'chore-3', title: 'Vacuum', icon: '🧹', points: 10 },
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
  ],
};

describe('MyChoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseSWR.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseSWR.mockReturnValue({
      data: null,
      error: new Error('Failed'),
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText(/failed to load chores/i)).toBeInTheDocument();
    expect(screen.getByText(/retry/i)).toBeInTheDocument();
  });

  it('renders empty state when no assignments', () => {
    mockUseSWR.mockReturnValue({
      data: { assignments: [] },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByText(/view all chores/i)).toBeInTheDocument();
  });

  it('renders assignments with titles', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText('Take out trash')).toBeInTheDocument();
    expect(screen.getByText('Do dishes')).toBeInTheDocument();
    expect(screen.getByText('Vacuum')).toBeInTheDocument();
  });

  it('shows overdue section for overdue assignments', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows points badges for assignments', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText('+5 pts')).toBeInTheDocument();
    expect(screen.getByText('+3 pts')).toBeInTheDocument();
    expect(screen.getByText('+10 pts')).toBeInTheDocument();
  });

  it('shows quick stats badges', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    // Should show overdue count
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    // Should show today count
    expect(screen.getByText('1 due today')).toBeInTheDocument();
  });

  it('has done buttons for each assignment', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    // Should have 3 "Done" buttons
    const doneButtons = screen.getAllByRole('button', { name: /done/i });
    expect(doneButtons.length).toBe(3);
  });

  it('renders chore icons', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    expect(screen.getByText('🗑️')).toBeInTheDocument();
    expect(screen.getByText('🍽️')).toBeInTheDocument();
    expect(screen.getByText('🧹')).toBeInTheDocument();
  });

  it('has link back to all chores', () => {
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<MyChoresPage />);

    const backLink = screen.getByText('← Back to all chores');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/chores');
  });

  it('calls mutate when done button is clicked', async () => {
    const mockMutate = vi.fn();
    mockUseSWR.mockReturnValue({
      data: mockAssignments,
      isLoading: false,
      error: null,
      mutate: mockMutate,
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<MyChoresPage />);

    const doneButtons = screen.getAllByRole('button', { name: /done/i });
    fireEvent.click(doneButtons[0]);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
