/**
 * Tests for IconSelector component
 * REQ-5-021: Create chore icon selector component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IconSelector } from './IconSelector';

describe('IconSelector', () => {
  const defaultProps = {
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button with default icon', () => {
    render(<IconSelector {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('✨');
  });

  it('renders trigger button with selected icon', () => {
    render(<IconSelector {...defaultProps} value="🧹" />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('🧹');
  });

  it('opens dropdown when trigger is clicked', () => {
    render(<IconSelector {...defaultProps} />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();
  });

  it('closes dropdown when backdrop is clicked', async () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();

    // Click backdrop (the fixed inset-0 div)
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);

    // Wait for animation to complete
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search icons...')).not.toBeInTheDocument();
    });
  });

  it('calls onChange when an icon is selected', async () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Click on an icon (the broom emoji)
    const broomButton = screen.getByText('🧹');
    fireEvent.click(broomButton);

    expect(defaultProps.onChange).toHaveBeenCalledWith('🧹');
  });

  it('closes dropdown after selecting an icon', async () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search icons...')).toBeInTheDocument();

    // Click on an icon (use broom which isn't the default)
    const broomButton = screen.getByText('🧹');
    fireEvent.click(broomButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search icons...')).not.toBeInTheDocument();
    });
  });

  it('shows category tabs', () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Laundry')).toBeInTheDocument();
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  it('filters icons by category when category is clicked', () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Click on Cleaning category
    const cleaningTab = screen.getByText('Cleaning');
    fireEvent.click(cleaningTab);

    // Should show cleaning icons
    expect(screen.getByText('🧹')).toBeInTheDocument();
    expect(screen.getByText('🧽')).toBeInTheDocument();
  });

  it('has search input', () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText('Search icons...');
    expect(searchInput).toBeInTheDocument();
  });

  it('clears search when X button is clicked', () => {
    render(<IconSelector {...defaultProps} />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search icons...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    // Click clear button
    const clearButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('highlights selected icon in grid', () => {
    render(<IconSelector {...defaultProps} value="🧹" />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Find the broom button in the grid
    const buttons = screen.getAllByText('🧹');
    // The one in the grid (not the trigger) should have the ring class
    const gridButton = buttons.find((btn) => btn.className.includes('ring-2'));
    expect(gridButton).toBeInTheDocument();
  });

  it('shows current selection at bottom when value is set', () => {
    render(<IconSelector {...defaultProps} value="🧹" />);

    // Open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('Selected:')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<IconSelector {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
