/**
 * Tests for FamilyAvatar component
 * Phase 4: Core Components - Family Member Avatar
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FamilyAvatar } from './FamilyAvatar';
import type { FamilyMember } from '@/lib/types/family';

const mockMember: FamilyMember = {
  id: '1',
  name: 'John Doe',
  avatarUrl: null,
  color: '#3b82f6',
};

const mockMemberWithAvatar: FamilyMember = {
  id: '2',
  name: 'Jane Smith',
  avatarUrl: '/test-avatar.jpg',
  color: '#22c55e',
};

describe('FamilyAvatar', () => {
  describe('initials rendering', () => {
    it('renders initials from two-part name', () => {
      render(<FamilyAvatar member={mockMember} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders first two letters for single-word name', () => {
      const singleName: FamilyMember = { ...mockMember, name: 'John' };
      render(<FamilyAvatar member={singleName} />);
      expect(screen.getByText('JO')).toBeInTheDocument();
    });

    it('handles three-part names correctly', () => {
      const threePart: FamilyMember = { ...mockMember, name: 'Mary Jane Watson' };
      render(<FamilyAvatar member={threePart} />);
      expect(screen.getByText('MW')).toBeInTheDocument();
    });

    it('renders question mark for empty name', () => {
      const emptyName: FamilyMember = { ...mockMember, name: '' };
      render(<FamilyAvatar member={emptyName} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders initials in uppercase', () => {
      const lowercase: FamilyMember = { ...mockMember, name: 'john doe' };
      render(<FamilyAvatar member={lowercase} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('avatar image', () => {
    it('renders fallback and avatar structure when avatarUrl is provided', () => {
      const { container } = render(<FamilyAvatar member={mockMemberWithAvatar} />);
      // Radix Avatar shows fallback until image loads, but avatar structure should exist
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
      // Fallback should still show initials (until image loads)
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('renders fallback with initials when avatarUrl is null', () => {
      render(<FamilyAvatar member={mockMember} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies correct size classes for sm', () => {
      const { container } = render(<FamilyAvatar member={mockMember} size="sm" />);
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveClass('h-8', 'w-8');
    });

    it('applies correct size classes for md (default)', () => {
      const { container } = render(<FamilyAvatar member={mockMember} />);
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveClass('h-10', 'w-10');
    });

    it('applies correct size classes for lg', () => {
      const { container } = render(<FamilyAvatar member={mockMember} size="lg" />);
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).toHaveClass('h-14', 'w-14');
    });
  });

  describe('selected state', () => {
    it('applies ring when selected', () => {
      const { container } = render(<FamilyAvatar member={mockMember} selected />);
      expect(container.firstChild).toHaveClass('ring-2', 'ring-primary');
    });

    it('does not apply ring when not selected', () => {
      const { container } = render(<FamilyAvatar member={mockMember} selected={false} />);
      expect(container.firstChild).not.toHaveClass('ring-2');
    });
  });

  describe('interactive behavior', () => {
    it('renders as button when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<FamilyAvatar member={mockMember} onClick={handleClick} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('does not render as button when onClick is not provided', () => {
      render(<FamilyAvatar member={mockMember} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<FamilyAvatar member={mockMember} onClick={handleClick} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('sets aria-label with member name', () => {
      const handleClick = vi.fn();
      render(<FamilyAvatar member={mockMember} onClick={handleClick} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Select John Doe');
    });

    it('sets aria-pressed when selected', () => {
      const handleClick = vi.fn();
      render(<FamilyAvatar member={mockMember} onClick={handleClick} selected />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('color styling', () => {
    it('applies custom color to fallback background', () => {
      const { container } = render(<FamilyAvatar member={mockMember} />);
      const fallback = container.querySelector('[data-slot="avatar-fallback"]');
      expect(fallback).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(<FamilyAvatar member={mockMember} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
