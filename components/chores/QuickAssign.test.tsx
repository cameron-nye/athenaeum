import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickAssign } from './QuickAssign';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}));

// Mock framer-motion
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

describe('QuickAssign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: mockMembers });
    global.fetch = vi.fn();
  });

  it('renders assign button', () => {
    render(<QuickAssign choreId="chore-1" />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    render(<QuickAssign choreId="chore-1" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Due date')).toBeInTheDocument();
      expect(screen.getByText('Assign to')).toBeInTheDocument();
    });
  });

  it('shows today and tomorrow options', async () => {
    render(<QuickAssign choreId="chore-1" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });
  });

  it('shows household members', async () => {
    render(<QuickAssign choreId="chore-1" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('can select a member', async () => {
    render(<QuickAssign choreId="chore-1" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Alice'));

    // Alice should now be highlighted with a check mark
    await waitFor(() => {
      const aliceButton = screen.getByText('Alice').closest('button');
      expect(aliceButton).toHaveClass('bg-indigo-100');
    });
  });

  it('can toggle between today and tomorrow', async () => {
    render(<QuickAssign choreId="chore-1" />);

    fireEvent.click(screen.getByRole('button'));

    // Click tomorrow
    fireEvent.click(screen.getByText('Tomorrow'));

    await waitFor(() => {
      const tomorrowButton = screen.getByText('Tomorrow').closest('button');
      expect(tomorrowButton).toHaveClass('bg-indigo-100');
    });
  });

  it('calls API and onAssigned when assigning', async () => {
    const mockOnAssigned = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<QuickAssign choreId="chore-1" onAssigned={mockOnAssigned} />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));

    // Select a member
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Alice'));

    // Click assign button
    fireEvent.click(screen.getByText('Assign Chore'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chores/assignments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await waitFor(() => {
      expect(mockOnAssigned).toHaveBeenCalled();
    });
  });

  it('shows success state after assignment', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<QuickAssign choreId="chore-1" />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));

    // Select a member
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Alice'));

    // Click assign button
    fireEvent.click(screen.getByText('Assign Chore'));

    await waitFor(() => {
      expect(screen.getByText('Assigned!')).toBeInTheDocument();
    });
  });

  it('disables assign button when no member selected', async () => {
    render(<QuickAssign choreId="chore-1" />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const assignButton = screen.getByText('Assign Chore').closest('button');
      expect(assignButton).toBeDisabled();
    });
  });

  it('stops event propagation on button click', () => {
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <QuickAssign choreId="chore-1" />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));

    // Parent should not be clicked
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it('stops event propagation on dropdown click', async () => {
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <QuickAssign choreId="chore-1" />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Alice'));

    // Parent should not be clicked
    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
