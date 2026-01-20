'use client';

/**
 * Display Registration Client Component
 * REQ-3-003: Register and manage display devices
 * REQ-3-030: QR code for easy setup
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Plus, Trash2, Clock, Copy, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';

interface Display {
  id: string;
  name: string;
  auth_token: string;
  last_seen_at: string | null;
  created_at: string;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  return lastSeen > tenMinutesAgo;
}

function DisplaysPageContent() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showQrForDisplay, setShowQrForDisplay] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  const fetchDisplays = useCallback(async () => {
    const { data, error } = await supabase
      .from('displays')
      .select('id, name, auth_token, last_seen_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const data = await fetchDisplays();
        if (mounted) {
          setDisplays(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load displays');
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [fetchDisplays]);

  const handleCreateDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setIsCreating(true);
    setError(null);

    // Get current user's household_id
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setIsCreating(false);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.household_id) {
      setError('Could not find your household');
      setIsCreating(false);
      return;
    }

    // Generate secure token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const authToken = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');

    const { error: insertError } = await supabase.from('displays').insert({
      name: newDisplayName.trim(),
      auth_token: authToken,
      household_id: userData.household_id,
    });

    setIsCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewDisplayName('');
    setShowCreateForm(false);
    await fetchDisplays();
  };

  const handleDeleteDisplay = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this display? It will need to be set up again.')
    ) {
      return;
    }

    setDeletingId(id);

    const { error: deleteError } = await supabase.from('displays').delete().eq('id', id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await fetchDisplays();
  };

  const getSetupUrl = (token: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/setup?token=${token}`;
  };

  const copyToClipboard = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-10 w-32 animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold">Displays</h1>
          <p className="text-muted-foreground mt-1">Manage your wall display devices</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateForm(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Display
        </motion.button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4">{error}</div>}

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleCreateDisplay}
              className="bg-card border-border space-y-4 rounded-lg border p-6"
            >
              <div>
                <label
                  htmlFor="displayName"
                  className="text-foreground mb-2 block text-sm font-medium"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g., Kitchen Display"
                  className="bg-background border-input focus:ring-ring w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isCreating || !newDisplayName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Display'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewDisplayName('');
                  }}
                  className="text-muted-foreground hover:text-foreground px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {displays.length === 0 ? (
        <div className="bg-card border-border rounded-lg border py-12 text-center">
          <Monitor className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h2 className="text-foreground mb-2 text-lg font-medium">No displays registered</h2>
          <p className="text-muted-foreground mb-6">
            Add a display to show your calendar on a wall-mounted screen
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2"
          >
            <Plus className="h-5 w-5" />
            Add Your First Display
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displays.map((display) => {
            const online = isOnline(display.last_seen_at);
            const setupUrl = getSetupUrl(display.auth_token);

            return (
              <motion.div
                key={display.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card border-border rounded-lg border p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-3 ${online ? 'bg-green-500/10' : 'bg-muted'} `}>
                      <Monitor
                        className={`h-6 w-6 ${online ? 'text-green-500' : 'text-muted-foreground'} `}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground font-medium">{display.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            online
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-muted text-muted-foreground'
                          } `}
                        >
                          {online ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last seen: {formatRelativeTime(display.last_seen_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDisplay(display.id)}
                    disabled={deletingId === display.id}
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors disabled:opacity-50"
                    aria-label="Delete display"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="border-border mt-4 border-t pt-4">
                  <div className="text-foreground mb-2 text-sm font-medium">Setup URL</div>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted text-muted-foreground flex-1 truncate rounded px-3 py-2 font-mono text-sm">
                      {setupUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(setupUrl, display.auth_token)}
                      className="text-muted-foreground hover:text-foreground p-2 transition-colors"
                      aria-label="Copy setup URL"
                    >
                      {copiedToken === display.auth_token ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowQrForDisplay(display.id)}
                      className="text-muted-foreground hover:text-foreground p-2 transition-colors"
                      aria-label="Show QR code"
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-muted-foreground mt-2 text-xs">
                    Navigate to this URL on your Raspberry Pi or scan the QR code
                  </p>

                  {/* QR Code Modal */}
                  <AnimatePresence>
                    {showQrForDisplay === display.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
                        onClick={() => setShowQrForDisplay(null)}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-card border-border mx-4 w-full max-w-sm rounded-lg border p-6 shadow-lg"
                        >
                          <h3 className="text-foreground mb-4 text-center text-lg font-medium">
                            Setup QR Code
                          </h3>
                          <p className="text-muted-foreground mb-4 text-center text-sm">
                            Scan this code with your phone to verify the setup URL
                          </p>
                          <div className="flex justify-center rounded-lg bg-white p-4">
                            <QRCodeSVG
                              value={setupUrl}
                              size={200}
                              level="M"
                              includeMargin={false}
                            />
                          </div>
                          <p className="text-muted-foreground mt-4 text-center font-mono text-xs break-all">
                            {setupUrl}
                          </p>
                          <button
                            onClick={() => setShowQrForDisplay(null)}
                            className="text-muted-foreground hover:text-foreground mt-4 w-full py-2 text-sm"
                          >
                            Close
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/settings/displays/${display.id}`)}
                    className="text-primary text-sm hover:underline"
                  >
                    Configure display settings →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DisplaysClient() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <DisplaysPageContent />
    </Suspense>
  );
}
