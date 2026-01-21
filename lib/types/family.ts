/**
 * Shared type definitions for family members.
 * Used across components for consistent typing.
 */

/**
 * Represents a family member for display components.
 * Used by FamilyAvatar and other family-related components.
 */
export interface FamilyMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color: string;
}

/**
 * Represents a household member from the API.
 * Contains additional fields from the database.
 */
export interface HouseholdMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

/**
 * Converts a HouseholdMember to a FamilyMember for display.
 * Generates a consistent color from the member's ID.
 */
export function toFamilyMember(member: HouseholdMember): FamilyMember {
  return {
    id: member.id,
    name: member.display_name || member.email.split('@')[0],
    avatarUrl: member.avatar_url,
    color: stringToColor(member.id),
  };
}

/**
 * Generate a consistent color from a string (id/name/email).
 * Returns a Tailwind-compatible hex color.
 */
export function stringToColor(str: string): string {
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#10b981', // emerald-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#0ea5e9', // sky-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#a855f7', // purple-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
