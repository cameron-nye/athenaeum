import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekView } from './WeekView';
import type { CalendarViewEvent } from '@/lib/calendar/queries';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} onClick={onClick} {...props}>
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
    end_time: '2024-01-15T11:00:00Z',
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
    start_time: '2024-01-17T00:00:00Z',
    end_time: '2024-01-18T00:00:00Z',
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

describe('WeekView', () => {
  const defaultProps = {
    events: mockEvents,
    currentDate: new Date('2024-01-15T12:00:00Z'), // Monday
    onDateChange: vi.fn(),
  };

  it('renders the week date range in the header', () => {
    render(<WeekView {...defaultProps} />);

    // Should show the week range (Sunday to Saturday)
    expect(screen.getByText(/Jan 14/)).toBeInTheDocument(); // Week starts Sunday
    expect(screen.getByText(/Jan 20/)).toBeInTheDocument(); // Week ends Saturday
  });

  it('renders all weekday headers', () => {
    render(<WeekView {...defaultProps} />);

    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders timed events', () => {
    render(<WeekView {...defaultProps} />);

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('renders all-day events in the all-day section', () => {
    render(<WeekView {...defaultProps} />);

    expect(screen.getByText('Company Holiday')).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('calls onDateChange when navigating to previous week', () => {
    const onDateChange = vi.fn();
    render(<WeekView {...defaultProps} onDateChange={onDateChange} />);

    const prevButton = screen.getByLabelText('Previous week');
    fireEvent.click(prevButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    // Should be Jan 8, 2024 (one week back)
    expect(newDate.getUTCDate()).toBe(8);
  });

  it('calls onDateChange when navigating to next week', () => {
    const onDateChange = vi.fn();
    render(<WeekView {...defaultProps} onDateChange={onDateChange} />);

    const nextButton = screen.getByLabelText('Next week');
    fireEvent.click(nextButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    // Should be Jan 22, 2024 (one week forward)
    expect(newDate.getUTCDate()).toBe(22);
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = vi.fn();
    render(<WeekView {...defaultProps} onEventClick={onEventClick} />);

    const eventElement = screen.getByText('Team Meeting');
    fireEvent.click(eventElement);

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('shows hour labels', () => {
    render(<WeekView {...defaultProps} />);

    // Check for some hour labels
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12PM')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<WeekView {...defaultProps} isLoading={true} />);

    // Should not show actual events
    expect(screen.queryByText('Team Meeting')).not.toBeInTheDocument();

    // Should show skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies calendar source color to events', () => {
    render(<WeekView {...defaultProps} />);

    const teamMeetingEvent = screen.getByTitle(/Team Meeting/);
    expect(teamMeetingEvent).toHaveStyle({ backgroundColor: '#4285F4' });
  });
});
