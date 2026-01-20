import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Suspense } from 'react';
import ChoreDetailPage from './page';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Filter out framer-motion specific props
      const {
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        layout: _layout,
        variants: _variants,
        ...domProps
      } = props;
      return <div {...domProps}>{children}</div>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...domProps
      } = props;
      return <p {...domProps}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock RecurrenceSelector
vi.mock('@/components/chores/RecurrenceSelector', () => ({
  RecurrenceSelector: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
  }) => (
    <select
      data-testid="recurrence-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">None</option>
      <option value="FREQ=WEEKLY">Weekly</option>
    </select>
  ),
}));

// Mock IconSelector
vi.mock('@/components/chores/IconSelector', () => ({
  IconSelector: () => <div data-testid="icon-selector">Icon Selector</div>,
}));

// Mock UserAvatar
vi.mock('@/components/ui/UserAvatar', () => ({
  UserAvatar: ({ name }: { name: string | null }) => (
    <span data-testid="user-avatar">{name?.charAt(0) || '?'}</span>
  ),
}));

// Mock parseRRuleToText
vi.mock('@/lib/chores/recurrence', () => ({
  parseRRuleToText: (rule: string) => `Recurs: ${rule}`,
}));

import useSWR from 'swr';

const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const mockChoreData = {
  chore: {
    id: 'chore-1',
    household_id: 'household-1',
    title: 'Test Chore',
    description: 'Test description',
    icon: '🧹',
    points: 10,
    created_at: '2026-01-01T00:00:00Z',
  },
  assignments: [
    {
      id: 'assign-1',
      chore_id: 'chore-1',
      due_date: today,
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      users: { id: 'user-1', display_name: 'Alice', avatar_url: null },
    },
    {
      id: 'assign-2',
      chore_id: 'chore-1',
      due_date: tomorrow,
      assigned_to: 'user-2',
      recurrence_rule: 'FREQ=WEEKLY',
      completed_at: null,
      created_at: '2026-01-01T00:00:00Z',
      users: { id: 'user-2', display_name: 'Bob', avatar_url: null },
    },
    {
      id: 'assign-3',
      chore_id: 'chore-1',
      due_date: '2026-01-10',
      assigned_to: 'user-1',
      recurrence_rule: null,
      completed_at: '2026-01-10T12:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
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

// Helper to render with suspense
function renderWithSuspense(ui: React.ReactElement) {
  return render(<Suspense fallback={<div>Loading...</div>}>{ui}</Suspense>);
}

describe('ChoreDetailPage - Assignment Edit', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  const setupMocks = () => {
    mockUseSWR.mockImplementation((url: string) => {
      if (url.includes('/api/household/members')) {
        return {
          data: mockMembersData,
          isLoading: false,
          error: null,
          mutate: mockMutate,
        };
      }
      return {
        data: mockChoreData,
        isLoading: false,
        error: null,
        mutate: mockMutate,
      };
    });
  };

  it('renders pending assignments with chore title', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    // Should show pending assignments (Alice appears twice - pending and completed)
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows edit modal when opened', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    // Find the three-dot menu button for a pending assignment
    const moreButtons = screen.getAllByRole('button');

    // Find and click a menu button with more-horizontal icon
    let menuFound = false;
    for (const btn of moreButtons) {
      if (btn.querySelector('svg')?.classList.contains('lucide-more-horizontal')) {
        await act(async () => {
          fireEvent.click(btn);
        });
        menuFound = true;
        break;
      }
    }

    if (menuFound) {
      // Click Edit in dropdown
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      // Should show edit modal
      await waitFor(() => {
        expect(screen.getByText('Edit Assignment')).toBeInTheDocument();
      });
    }
  });

  it('shows delete dialog when opened', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    // Find and click a menu button
    const moreButtons = screen.getAllByRole('button');

    let menuFound = false;
    for (const btn of moreButtons) {
      if (btn.querySelector('svg')?.classList.contains('lucide-more-horizontal')) {
        await act(async () => {
          fireEvent.click(btn);
        });
        menuFound = true;
        break;
      }
    }

    if (menuFound) {
      // Click Delete in dropdown
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      // Should show delete dialog
      await waitFor(() => {
        expect(screen.getByText('Delete Assignment?')).toBeInTheDocument();
      });
    }
  });

  it('shows recurrence options in delete dialog for recurring assignment', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    // Find all menu buttons
    const moreButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-more-horizontal'));

    // Click the second menu (recurring assignment - Bob's)
    if (moreButtons.length >= 2) {
      await act(async () => {
        fireEvent.click(moreButtons[1]);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      // Should show recurring options
      await waitFor(() => {
        expect(screen.getByText(/this is a recurring assignment/i)).toBeInTheDocument();
        expect(screen.getByText(/only this assignment/i)).toBeInTheDocument();
        expect(screen.getByText(/this and all future occurrences/i)).toBeInTheDocument();
      });
    }
  });

  it('calls delete API when confirming deletion', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    const moreButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-more-horizontal'));

    if (moreButtons.length > 0) {
      await act(async () => {
        fireEvent.click(moreButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Delete Assignment?')).toBeInTheDocument();
      });

      // Find the Delete button in the dialog (not the one in dropdown)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      const confirmButton = deleteButtons.find(
        (btn) => btn.closest('.rounded-2xl') // Inside dialog
      );

      if (confirmButton) {
        await act(async () => {
          fireEvent.click(confirmButton);
        });

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/chores/assignments/'),
            expect.objectContaining({ method: 'DELETE' })
          );
        });
      }
    }
  });

  it('calls PATCH API when saving edit', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    const moreButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-more-horizontal'));

    if (moreButtons.length > 0) {
      await act(async () => {
        fireEvent.click(moreButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      // Change due date in edit modal
      await waitFor(() => {
        expect(screen.getByText('Edit Assignment')).toBeInTheDocument();
      });

      const dueDateInput = screen.getByDisplayValue(today);
      await act(async () => {
        fireEvent.change(dueDateInput, { target: { value: tomorrow } });
      });

      // Save changes
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/chores/assignments/'),
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining(tomorrow),
          })
        );
      });
    }
  });

  it('closes edit modal on cancel', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    const moreButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-more-horizontal'));

    if (moreButtons.length > 0) {
      await act(async () => {
        fireEvent.click(moreButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Edit'));
      });

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByText('Edit Assignment')).toBeInTheDocument();
      });

      // Click cancel
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      });

      // Modal should be gone
      await waitFor(() => {
        expect(screen.queryByText('Edit Assignment')).not.toBeInTheDocument();
      });
    }
  });

  it('renders completed assignments section', async () => {
    setupMocks();

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Chore')).toBeInTheDocument();
    });

    // Should show completed section
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});

describe('ChoreDetailPage - Loading and Error states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', async () => {
    mockUseSWR.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('renders error state', async () => {
    mockUseSWR.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed'),
      mutate: vi.fn(),
    });

    await act(async () => {
      renderWithSuspense(<ChoreDetailPage params={Promise.resolve({ id: 'chore-1' })} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to load chore/i)).toBeInTheDocument();
    });
  });
});
