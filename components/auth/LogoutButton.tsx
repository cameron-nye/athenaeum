'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2',
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
      aria-label="Log out"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <LogOut className="h-5 w-5" />
          <span className="hidden sm:inline">Log out</span>
        </>
      )}
    </button>
  );
}
