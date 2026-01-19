import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayView } from './DayView';
import type { CalendarViewEvent } from '@/lib/calendar/queries';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      style,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      animate,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      animate?: unknown;
    }) => (
      <div className={className} onClick={onClick} style={style} {...props}>
        {children}
      </div>
    ),
    button: ({
      children,
      className,
      onClick,
      style,
      title,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button className={className} onClick={onClick} style={style} title={title} {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockEvents: CalendarViewEvent[] = [
  {
    id: 'event-1',
    calendar_source_id: 'cal-1',
    external_id: 'ext-1',
    title: 'Team Meeting',
    description: 'Weekly sync',
    location: 'Room 101',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T11:30:00Z',
    all_day: false,
    recurrence_rule: null,
    calendar_source: {
      id: 'cal-1',
      name: 'Work',
      color: '#4285F4',
      provider: 'google',
    },
  },
  {
    id: 'event-2',
    calendar_source_id: 'cal-1',
    external_id: 'ext-2',
    title: 'Company Holiday',
    description: null,
    location: null,
    start_time: '2024-01-15T00:00:00Z',
    end_time: '2024-01-16T00:00:00Z',
    all_day: true,
    recurrence_rule: null,
    calendar_source: {
      id: 'cal-1',
      name: 'Work',
      color: '#34A853',
      provider: 'google',
    },
  },
];

describe('DayView', () => {
  const defaultProps = {
    events: mockEvents,
    currentDate: new Date('2024-01-15T12:00:00Z'),
    onDateChange: vi.fn(),
  };

  it('renders the full date in the header', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText(/Monday, January 15, 2024/)).toBeInTheDocument();
  });

  it('renders timed events', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('renders all-day events in the all-day section', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('shows event time range for timed events', () => {
    render(<DayView {...defaultProps} />);

    // Should show start and end time
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/11:30 AM/)).toBeInTheDocument();
  });

  it('shows event location when available', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText('Room 101')).toBeInTheDocument();
  });

  it('calls onDateChange when navigating to previous day', () => {
    const onDateChange = vi.fn();
    render(<DayView {...defaultProps} onDateChange={onDateChange} />);

    const prevButton = screen.getByLabelText('Previous day');
    fireEvent.click(prevButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    expect(newDate.getUTCDate()).toBe(14);
  });

  it('calls onDateChange when navigating to next day', () => {
    const onDateChange = vi.fn();
    render(<DayView {...defaultProps} onDateChange={onDateChange} />);

    const nextButton = screen.getByLabelText('Next day');
    fireEvent.click(nextButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    expect(newDate.getUTCDate()).toBe(16);
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = vi.fn();
    render(<DayView {...defaultProps} onEventClick={onEventClick} />);

    const eventElement = screen.getByTitle('Team Meeting');
    fireEvent.click(eventElement);

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('shows hour labels', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12PM')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<DayView {...defaultProps} isLoading={true} />);

    // Should not show actual events
    expect(screen.queryByText('Team Meeting')).not.toBeInTheDocument();

    // Should show skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies calendar source color to events', () => {
    render(<DayView {...defaultProps} />);

    const teamMeetingEvent = screen.getByTitle('Team Meeting');
    expect(teamMeetingEvent).toHaveStyle({ backgroundColor: '#4285F4' });
  });

  it('shows Today label when viewing current day', () => {
    // Set the current date to today
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);

    render(<DayView {...defaultProps} currentDate={today} events={[]} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
