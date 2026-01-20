'use client';

/**
 * Display Setup/Pairing Page
 * REQ-3-004: Authenticate display device with token
 */

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Monitor, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DISPLAY_TOKEN_COOKIE } from '@/lib/supabase/display-constants';

type SetupStatus = 'validating' | 'success' | 'error';

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Initialize with error state if no token
  const [status, setStatus] = useState<SetupStatus>(token ? 'validating' : 'error');
  const [error, setError] = useState<string | null>(
    token ? null : 'No token provided. Please use the setup URL from your dashboard.'
  );
  const hasValidated = useRef(false);

  useEffect(() => {
    if (!token || hasValidated.current) {
      return;
    }

    hasValidated.current = true;

    // Validate token via API
    const validateToken = async () => {
      try {
        const response = await fetch('/api/displays/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setError(data.error || 'Invalid token');
          return;
        }

        // Set the display token cookie
        document.cookie = `${DISPLAY_TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=strict`;

        setStatus('success');

        // Redirect to display page after short delay
        setTimeout(() => {
          router.replace(`/${data.displayId}`);
        }, 2000);
      } catch {
        setStatus('error');
        setError('Failed to validate token. Please try again.');
      }
    };

    validateToken();
  }, [token, router]);

  return (
    <div className="bg-background flex h-screen w-screen items-center justify-center">
      <div className="mx-4 w-full max-w-md text-center">
        {status === 'validating' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 rounded-full p-4">
                <Monitor className="text-primary h-12 w-12" />
              </div>
            </div>
            <div>
              <h1 className="text-foreground mb-2 text-2xl font-semibold">Setting up display...</h1>
              <p className="text-muted-foreground">Validating your display token</p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-foreground mb-2 text-2xl font-semibold">Display connected!</h1>
              <p className="text-muted-foreground">Redirecting to your calendar display...</p>
            </div>
            <div className="flex justify-center">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-destructive/10 rounded-full p-4">
                <AlertCircle className="text-destructive h-12 w-12" />
              </div>
            </div>
            <div>
              <h1 className="text-foreground mb-2 text-2xl font-semibold">Setup failed</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="pt-4">
              <p className="text-muted-foreground text-sm">
                Please check that you&apos;re using the correct setup URL from your dashboard, or
                contact support if the problem persists.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex h-screen w-screen items-center justify-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
