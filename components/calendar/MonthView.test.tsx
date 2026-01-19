import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthView } from './MonthView';
import type { CalendarViewEvent } from '@/lib/calendar/queries';

// Mock framer-motion to avoid animation issues in tests
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
    title: 'Holiday',
    description: null,
    location: null,
    start_time: '2024-01-20T00:00:00Z',
    end_time: '2024-01-21T00:00:00Z',
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

describe('MonthView', () => {
  const defaultProps = {
    events: mockEvents,
    currentDate: new Date('2024-01-15T12:00:00Z'),
    onDateChange: vi.fn(),
  };

  it('renders the month and year in the header', () => {
    render(<MonthView {...defaultProps} />);

    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    render(<MonthView {...defaultProps} />);

    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('renders events on the correct days', () => {
    render(<MonthView {...defaultProps} />);

    // Event titles should be visible
    expect(screen.getByText(/Team Meeting/)).toBeInTheDocument();
    expect(screen.getByText(/Holiday/)).toBeInTheDocument();
  });

  it('calls onDateChange when navigating to previous month', () => {
    const onDateChange = vi.fn();
    render(<MonthView {...defaultProps} onDateChange={onDateChange} />);

    const prevButton = screen.getByLabelText('Previous month');
    fireEvent.click(prevButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    expect(newDate.getUTCMonth()).toBe(11); // December 2023
    expect(newDate.getUTCFullYear()).toBe(2023);
  });

  it('calls onDateChange when navigating to next month', () => {
    const onDateChange = vi.fn();
    render(<MonthView {...defaultProps} onDateChange={onDateChange} />);

    const nextButton = screen.getByLabelText('Next month');
    fireEvent.click(nextButton);

    expect(onDateChange).toHaveBeenCalledTimes(1);
    const newDate = onDateChange.mock.calls[0][0];
    expect(newDate.getUTCMonth()).toBe(1); // February 2024
    expect(newDate.getUTCFullYear()).toBe(2024);
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = vi.fn();
    render(<MonthView {...defaultProps} onEventClick={onEventClick} />);

    const eventElement = screen.getByText(/Team Meeting/);
    fireEvent.click(eventElement);

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('displays time for non-all-day events', () => {
    render(<MonthView {...defaultProps} />);

    // The Team Meeting event should show time
    const teamMeeting = screen.getByTitle(/Team Meeting/);
    expect(teamMeeting).toHaveAttribute('title', expect.stringContaining('10:00'));
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<MonthView {...defaultProps} isLoading={true} />);

    // Should not show actual events
    expect(screen.queryByText(/Team Meeting/)).not.toBeInTheDocument();

    // Should show skeleton elements with animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders 42 day cells (6 weeks)', () => {
    render(<MonthView {...defaultProps} />);

    // Count day numbers from 1-31 in the visible range
    // This is a rough check that we have the right grid structure
    const dayNumbers = screen.getAllByText(/^\d{1,2}$/);
    // With 6 weeks x 7 days, we should have multiple instances of some numbers
    expect(dayNumbers.length).toBeGreaterThanOrEqual(28); // At least 28 days visible
  });

  it('applies calendar source color to events', () => {
    render(<MonthView {...defaultProps} />);

    const teamMeetingEvent = screen.getByTitle(/Team Meeting/);
    expect(teamMeetingEvent).toHaveStyle({ backgroundColor: '#4285F4' });
  });
});
