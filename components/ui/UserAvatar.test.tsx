/**
 * Tests for UserAvatar component
 * REQ-5-028: Family member avatars
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserAvatar, AvatarGroup } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders initials when no avatar URL is provided', () => {
    render(<UserAvatar name="John Doe" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders first two letters for single-word name', () => {
    render(<UserAvatar name="John" />);

    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('renders question mark when name is null', () => {
    render(<UserAvatar name={null} />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders question mark when name is empty', () => {
    render(<UserAvatar name="" />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('handles three-part names correctly', () => {
    render(<UserAvatar name="Mary Jane Watson" />);

    // Should use first and last name initials
    expect(screen.getByText('MW')).toBeInTheDocument();
  });

  it('renders image when avatarUrl is provided', () => {
    render(<UserAvatar name="John Doe" avatarUrl="/test-avatar.jpg" />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('applies custom className', () => {
    const { container } = render(<UserAvatar name="Test" className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies correct size classes for xs', () => {
    const { container } = render(<UserAvatar name="Test" size="xs" />);

    expect(container.firstChild).toHaveClass('h-6', 'w-6');
  });

  it('applies correct size classes for md (default)', () => {
    const { container } = render(<UserAvatar name="Test" />);

    expect(container.firstChild).toHaveClass('h-10', 'w-10');
  });

  it('applies correct size classes for xl', () => {
    const { container } = render(<UserAvatar name="Test" size="xl" />);

    expect(container.firstChild).toHaveClass('h-16', 'w-16');
  });

  it('applies border when bordered prop is true', () => {
    const { container } = render(<UserAvatar name="Test" bordered />);

    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('generates consistent color for same name', () => {
    const { container: container1 } = render(<UserAvatar name="Alice" />);
    const { container: container2 } = render(<UserAvatar name="Alice" />);

    // Both should have the same bg color class
    const element1 = container1.firstChild as HTMLElement | null;
    const element2 = container2.firstChild as HTMLElement | null;
    const classes1 = element1?.className || '';
    const classes2 = element2?.className || '';

    // Extract bg-*-500 class
    const bgClass1 = classes1
      .split(' ')
      .find((c: string) => c.startsWith('bg-') && c.includes('-500'));
    const bgClass2 = classes2
      .split(' ')
      .find((c: string) => c.startsWith('bg-') && c.includes('-500'));

    expect(bgClass1).toBe(bgClass2);
  });
});

describe('AvatarGroup', () => {
  const users = [
    { name: 'Alice Smith', avatarUrl: null },
    { name: 'Bob Jones', avatarUrl: null },
    { name: 'Carol White', avatarUrl: null },
    { name: 'Dave Brown', avatarUrl: null },
  ];

  it('renders up to max avatars', () => {
    render(<AvatarGroup users={users} max={3} />);

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.getByText('CW')).toBeInTheDocument();
    expect(screen.queryByText('DB')).not.toBeInTheDocument();
  });

  it('shows remaining count when users exceed max', () => {
    render(<AvatarGroup users={users} max={3} />);

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not show remaining count when users equal max', () => {
    render(<AvatarGroup users={users.slice(0, 3)} max={3} />);

    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('renders all users when count is below max', () => {
    render(<AvatarGroup users={users.slice(0, 2)} max={3} />);

    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AvatarGroup users={users} className="custom-group" />);

    expect(container.firstChild).toHaveClass('custom-group');
  });

  it('handles empty users array', () => {
    const { container } = render(<AvatarGroup users={[]} />);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
