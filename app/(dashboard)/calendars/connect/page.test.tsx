import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarConnectPage from './page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({
      children,
      className,
      onClick,
      disabled,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
  },
}));

const mockCalendars = [
  { id: 'cal-1', name: 'Work Calendar', color: '#4285F4', provider: 'google', enabled: true },
  { id: 'cal-2', name: 'Personal', color: '#34A853', provider: 'google', enabled: false },
  { id: 'cal-3', name: 'Family', color: '#EA4335', provider: 'google', enabled: false },
];

describe('CalendarConnectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<CalendarConnectPage />);

    // Should show loading skeleton with animate-pulse elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders page title and description', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Select Calendars')).toBeInTheDocument();
    });

    expect(screen.getByText(/Choose which calendars you want to display/)).toBeInTheDocument();
  });

  it('renders calendar list after loading', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('pre-selects already enabled calendars', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    // Should show 1 of 3 selected (Work Calendar is enabled)
    expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();
  });

  it('toggles calendar selection on click', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });

    // Click Personal to select it
    fireEvent.click(screen.getByText('Personal'));

    // Should now show 2 of 3 selected
    await waitFor(() => {
      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();
    });
  });

  it('handles select all', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Select all')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select all'));

    await waitFor(() => {
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });
  });

  it('handles deselect all', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Deselect all')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deselect all'));

    await waitFor(() => {
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });
  });

  it('saves selection and redirects on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: mockCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Save Selection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Selection'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/calendars');
    });

    // Verify PATCH was called with correct data
    expect(global.fetch).toHaveBeenCalledWith('/api/calendars/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabledIds: ['cal-1'] }),
    });
  });

  it('shows error message on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch calendars')).toBeInTheDocument();
    });
  });

  it('shows empty state when no calendars', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: [] }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('No calendars found.')).toBeInTheDocument();
    });

    expect(screen.getByText('Please connect a Google account first.')).toBeInTheDocument();
  });

  it('navigates to calendars page on cancel', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarConnectPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockPush).toHaveBeenCalledWith('/calendars');
  });
});
