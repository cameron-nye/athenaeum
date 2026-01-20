'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);

    // Redirect to calendars after a short delay
    setTimeout(() => {
      router.push('/calendars');
      router.refresh();
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold">Password updated</h1>
        <p className="mt-2 text-gray-600">Your password has been successfully reset.</p>
        <p className="mt-4 text-sm text-gray-500">Redirecting to your calendars...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-2 text-gray-600">Enter your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2',
              'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
            )}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={cn(
              'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2',
              'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
            )}
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'flex w-full items-center justify-center rounded-lg px-4 py-2 font-medium',
            'bg-blue-600 text-white',
            'transition-colors hover:bg-blue-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
