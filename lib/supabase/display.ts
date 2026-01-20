/**
 * Supabase clients for display devices
 * REQ-3-028: Create Supabase client that works with display token auth
 */

import { createServerClient } from '@supabase/ssr';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const DISPLAY_TOKEN_COOKIE = 'display_token';
export const DISPLAY_TOKEN_HEADER = 'x-display-token';

/**
 * Creates a Supabase client for display Server Components.
 * Passes the display token in headers for RLS policies.
 */
export async function createDisplayServerClient() {
  const cookieStore = await cookies();
  const displayToken = cookieStore.get(DISPLAY_TOKEN_COOKIE)?.value;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component context
          }
        },
      },
      global: {
        headers: displayToken ? { [DISPLAY_TOKEN_HEADER]: displayToken } : undefined,
      },
    }
  );
}

/**
 * Creates a Supabase client for display Server Components with explicit token.
 * Use when you have the token directly (e.g., from query params).
 */
export async function createDisplayServerClientWithToken(displayToken: string) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component context
          }
        },
      },
      global: {
        headers: { [DISPLAY_TOKEN_HEADER]: displayToken },
      },
    }
  );
}

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
