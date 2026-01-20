/**
 * Client-side Supabase client for display devices
 * REQ-3-028: Create Supabase client that works with display token auth
 *
 * This file can be imported by both Client and Server Components.
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { DISPLAY_TOKEN_COOKIE, DISPLAY_TOKEN_HEADER } from './display-constants';

/**
 * Creates a Supabase client for display Client Components.
 * Retrieves token from cookie and passes in headers.
 */
export function createDisplayBrowserClient(displayToken: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { [DISPLAY_TOKEN_HEADER]: displayToken },
      },
    }
  );
}

/**
 * Gets the display token from cookies (for Client Components).
 * Returns null if not found.
 */
export function getDisplayTokenFromDocument(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split('; ');
  const tokenCookie = cookies.find((c) => c.startsWith(`${DISPLAY_TOKEN_COOKIE}=`));

  if (!tokenCookie) {
    return null;
  }

  return tokenCookie.split('=')[1] || null;
}
