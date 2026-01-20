import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarsPage from './page';
import { SWRConfig } from 'swr';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Wrapper to disable SWR cache between tests
function SWRWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

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
    span: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
    h1: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => (
      <p className={className} {...props}>
        {children}
      </p>
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
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

const mockCalendars = [
  {
    id: 'cal-1',
    name: 'Work Calendar',
    color: '#4285F4',
    provider: 'google',
    enabled: true,
    last_synced_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    id: 'cal-2',
    name: 'Personal',
    color: '#34A853',
    provider: 'google',
    enabled: false,
    last_synced_at: null,
  },
];

describe('CalendarsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockConfirm.mockReturnValue(true);
    mockLocation.href = '';
  });

  it('renders loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    render(<CalendarsPage />, { wrapper: SWRWrapper });

    // Should show loading skeleton with bg-muted elements (zen-styled skeleton)
    const skeletons = document.querySelectorAll('.bg-muted');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders page title and add button', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Calendars')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Calendar')).toBeInTheDocument();
    expect(screen.getByText(/Manage your connected calendar sources/)).toBeInTheDocument();
  });

  it('renders calendar list after loading', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('shows provider badges', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getAllByText('Google')).toHaveLength(2);
    });
  });

  it('shows last synced time', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    expect(screen.getByText('Never synced')).toBeInTheDocument();
  });

  it('redirects to OAuth when Add Calendar is clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Add Calendar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Calendar'));

    expect(mockLocation.href).toBe('/api/google/auth');
  });

  it('shows empty state when no calendars', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: [] }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('No calendars connected')).toBeInTheDocument();
    });

    expect(screen.getByText('Connect a Google Calendar to begin your journey')).toBeInTheDocument();
  });

  it('toggles calendar enabled state', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: mockCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    // Click the toggle for Work Calendar (first enable/disable button)
    const toggleButtons = screen.getAllByLabelText(/calendar/i);
    const enableToggle = toggleButtons.find((btn) =>
      btn.getAttribute('aria-label')?.includes('Disable')
    );

    if (enableToggle) {
      fireEvent.click(enableToggle);
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/calendars/sources', expect.any(Object));
    });
  });

  it('syncs calendar when sync button clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: mockCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: mockCalendars }),
      });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    const syncButtons = screen.getAllByLabelText('Sync calendar');
    fireEvent.click(syncButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/calendars/sync', expect.any(Object));
    });
  });

  it('deletes calendar when disconnect clicked and confirmed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sources: mockCalendars }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Disconnect calendar');
    fireEvent.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to disconnect "Work Calendar"?'
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/calendars/sources/cal-1', {
        method: 'DELETE',
      });
    });
  });

  it('navigates to calendar view when link clicked', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sources: mockCalendars }),
    });

    render(<CalendarsPage />, { wrapper: SWRWrapper });

    await waitFor(() => {
      expect(screen.getByText('View Calendar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Calendar'));

    expect(mockPush).toHaveBeenCalledWith('/calendars/view');
  });
});
