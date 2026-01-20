/**
 * Tests for RecurrenceSelector component
 * REQ-5-012: Create recurrence selector component
 */

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecurrenceSelector } from './RecurrenceSelector';

// Wrapper component to test controlled behavior
function ControlledRecurrenceSelector({
  initialValue = null,
  startDate,
  onChangeSpy,
}: {
  initialValue?: string | null;
  startDate: Date;
  onChangeSpy?: (rrule: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>(initialValue);

  const handleChange = (rrule: string | null) => {
    setValue(rrule);
    onChangeSpy?.(rrule);
  };

  return <RecurrenceSelector value={value} startDate={startDate} onChange={handleChange} />;
}

describe('RecurrenceSelector', () => {
  const defaultStartDate = new Date('2026-01-20');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default "Does not repeat" selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('none');
  });

  it('shows all recurrence options', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(5);
    expect(options.map((o) => o.value)).toEqual(['none', 'daily', 'weekly', 'biweekly', 'monthly']);
  });

  it('calls onChange with null when "none" is selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'none' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange with RRULE when "daily" is selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'daily' } });

    expect(onChange).toHaveBeenCalled();
    const rrule = onChange.mock.calls[0][0];
    expect(rrule).toContain('FREQ=DAILY');
  });

  it('calls onChange with RRULE when "weekly" is selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });

    expect(onChange).toHaveBeenCalled();
    const rrule = onChange.mock.calls[0][0];
    expect(rrule).toContain('FREQ=WEEKLY');
  });

  it('calls onChange with RRULE when "biweekly" is selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'biweekly' } });

    expect(onChange).toHaveBeenCalled();
    const rrule = onChange.mock.calls[0][0];
    expect(rrule).toContain('FREQ=WEEKLY');
    expect(rrule).toContain('INTERVAL=2');
  });

  it('calls onChange with RRULE when "monthly" is selected', () => {
    const onChange = vi.fn();
    render(<RecurrenceSelector startDate={defaultStartDate} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'monthly' } });

    expect(onChange).toHaveBeenCalled();
    const rrule = onChange.mock.calls[0][0];
    expect(rrule).toContain('FREQ=MONTHLY');
  });

  it('shows weekday selector for weekly recurrence (controlled)', async () => {
    render(<ControlledRecurrenceSelector startDate={defaultStartDate} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });

    // Wait for animation and check weekday buttons are visible
    await waitFor(() => {
      expect(screen.getByText('Mon')).toBeInTheDocument();
    });
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('shows monthday selector for monthly recurrence (controlled)', async () => {
    render(<ControlledRecurrenceSelector startDate={defaultStartDate} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'monthly' } });

    // Wait for animation and check day buttons
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('updates RRULE when weekday is changed (controlled)', async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledRecurrenceSelector startDate={defaultStartDate} onChangeSpy={onChangeSpy} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'weekly' } });

    // Wait for weekday buttons to appear
    await waitFor(() => {
      expect(screen.getByText('Fri')).toBeInTheDocument();
    });

    // Clear the onChange call from selecting weekly
    onChangeSpy.mockClear();

    // Click on Friday (index 4)
    const fridayButton = screen.getByText('Fri');
    fireEvent.click(fridayButton);

    expect(onChangeSpy).toHaveBeenCalled();
    const rrule = onChangeSpy.mock.calls[0][0];
    expect(rrule).toContain('BYDAY=FR');
  });

  it('updates RRULE when monthday is changed (controlled)', async () => {
    const onChangeSpy = vi.fn();
    render(<ControlledRecurrenceSelector startDate={defaultStartDate} onChangeSpy={onChangeSpy} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'monthly' } });

    // Wait for day buttons to appear
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    // Clear the onChange call from selecting monthly
    onChangeSpy.mockClear();

    // Click on day 15
    const day15Button = screen.getByText('15');
    fireEvent.click(day15Button);

    expect(onChangeSpy).toHaveBeenCalled();
    const rrule = onChangeSpy.mock.calls[0][0];
    expect(rrule).toContain('BYMONTHDAY=15');
  });

  it('shows preview text for non-none recurrence (controlled)', async () => {
    render(<ControlledRecurrenceSelector startDate={defaultStartDate} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'daily' } });

    // Wait for the preview text to appear after state update
    await waitFor(() => {
      expect(screen.getByText(/every day/i)).toBeInTheDocument();
    });
  });

  it('parses initial value and sets correct type', () => {
    const rruleString = 'DTSTART:20260120T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO';
    const onChange = vi.fn();

    render(
      <RecurrenceSelector value={rruleString} startDate={defaultStartDate} onChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('weekly');
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RecurrenceSelector
        startDate={defaultStartDate}
        onChange={onChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
