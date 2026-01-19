import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ColorPicker, CALENDAR_COLORS } from './ColorPicker';

describe('ColorPicker', () => {
  it('renders with default trigger button', () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /select calendar color/i })).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('shows current color in the trigger', () => {
    render(<ColorPicker value="#DC2626" onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: /select calendar color/i });
    const colorIndicator = trigger.querySelector('span');
    expect(colorIndicator).toHaveStyle({ backgroundColor: '#DC2626' });
  });

  it('opens dropdown when clicked', () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: /select calendar color/i });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('displays all color options', () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /select calendar color/i }));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(CALENDAR_COLORS.length);
  });

  it('marks current color as selected', () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /select calendar color/i }));

    const blueOption = screen.getByRole('option', { name: /blue/i });
    expect(blueOption).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onChange when color is selected', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#2563EB" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /select calendar color/i }));
    fireEvent.click(screen.getByRole('option', { name: /red/i }));

    expect(onChange).toHaveBeenCalledWith('#DC2626');
  });

  it('closes dropdown after selecting color', async () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /select calendar color/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /red/i }));
    // AnimatePresence exit animation may take time
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(<ColorPicker value="#2563EB" onChange={() => {}} disabled />);
    const trigger = screen.getByRole('button', { name: /select calendar color/i });

    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('uses default color when value is null', () => {
    render(<ColorPicker value={null} onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: /select calendar color/i });
    const colorIndicator = trigger.querySelector('span');
    // Should use first color from palette as default
    expect(colorIndicator).toHaveStyle({ backgroundColor: CALENDAR_COLORS[0].value });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ColorPicker value="#2563EB" onChange={() => {}} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
