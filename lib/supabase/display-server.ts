/**
 * Server-side Supabase client for display devices
 * REQ-3-028: Create Supabase client that works with display token auth
 *
 * This file uses 'next/headers' and can only be imported in Server Components.
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { DISPLAY_TOKEN_COOKIE, DISPLAY_TOKEN_HEADER } from './display-constants';

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
