/**
 * Display Route Layout
 * REQ-3-001: Full-screen layout for Raspberry Pi wall displays
 *
 * - Full-screen with no navigation chrome
 * - Soft pastel color palette (not harsh black/white)
 * - Dark mode uses warm neutral-800/900
 * - Light mode uses warm neutral-50/100
 * - Overflow hidden to prevent scrolling
 */

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Athenaeum Display',
  description: 'Family calendar display',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 1920,
  height: 1080,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#292524' },
  ],
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="display-root bg-background text-foreground h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
