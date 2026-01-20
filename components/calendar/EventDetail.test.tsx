import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventDetail } from './EventDetail';
import type { CalendarViewEvent } from '@/lib/calendar/queries';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      role,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      role?: string;
    }) => (
      <div className={className} onClick={onClick} role={role} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockEvent: CalendarViewEvent = {
  id: 'event-1',
  calendar_source_id: 'cal-1',
  external_id: 'ext-1',
  title: 'Team Meeting',
  description: 'Weekly sync meeting for the team',
  location: 'Conference Room A',
  start_time: '2024-01-15T10:00:00Z',
  end_time: '2024-01-15T11:30:00Z',
  all_day: false,
  recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
  calendar_source: {
    id: 'cal-1',
    name: 'Work Calendar',
    color: '#4285F4',
    provider: 'google',
  },
};

describe('EventDetail', () => {
  const defaultProps = {
    event: mockEvent,
    onClose: vi.fn(),
  };

  it('renders nothing when event is null', () => {
    const { container } = render(<EventDetail event={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the event title', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('renders the calendar source name', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getAllByText('Work Calendar')).toHaveLength(2); // Appears twice in UI
  });

  it('renders the event location', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
  });

  it('renders the event description', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getByText('Weekly sync meeting for the team')).toBeInTheDocument();
  });

  it('renders time range for timed events', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/11:30 AM/)).toBeInTheDocument();
  });

  it('renders "All day" for all-day events', () => {
    const allDayEvent = {
      ...mockEvent,
      all_day: true,
      start_time: '2024-01-15T00:00:00Z',
      end_time: '2024-01-16T00:00:00Z',
    };
    render(<EventDetail event={allDayEvent} onClose={vi.fn()} />);
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('renders recurrence info when present', () => {
    render(<EventDetail {...defaultProps} />);
    expect(screen.getByText('Recurring event')).toBeInTheDocument();
    expect(screen.getByText(/Weekly on Monday/)).toBeInTheDocument();
  });

  it('does not render recurrence section when no rule', () => {
    const noRecurrenceEvent = { ...mockEvent, recurrence_rule: null };
    render(<EventDetail event={noRecurrenceEvent} onClose={vi.fn()} />);
    expect(screen.queryByText('Recurring event')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<EventDetail {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<EventDetail {...defaultProps} onClose={onClose} />);

    // Click the backdrop (first element with onClick that isn't the modal)
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<EventDetail {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the color accent bar with calendar color', () => {
    render(<EventDetail {...defaultProps} />);

    // Find the color bar
    const colorBar = document.querySelector('[style*="background-color"]');
    expect(colorBar).toHaveStyle({ backgroundColor: '#4285F4' });
  });

  it('has correct ARIA attributes', () => {
    render(<EventDetail {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'event-title');
  });
});
