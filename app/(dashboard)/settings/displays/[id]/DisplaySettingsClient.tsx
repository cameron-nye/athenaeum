'use client';

/**
 * Display Settings Editor Client Component
 * REQ-3-012: Customize individual display settings
 */

import { useState, useEffect, useCallback, Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Monitor,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  parseDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  type DisplaySettings,
  type DisplayTheme,
  type DisplayLayout,
} from '@/lib/display/types';

interface DisplayData {
  id: string;
  name: string;
  auth_token: string;
  settings: DisplaySettings;
  last_seen_at: string | null;
}

function DisplaySettingsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [display, setDisplay] = useState<DisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  const fetchDisplay = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('displays')
      .select('id, name, auth_token, settings, last_seen_at')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    return {
      ...data,
      settings: parseDisplaySettings(data.settings as Record<string, unknown>),
    };
  }, [supabase, id]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const data = await fetchDisplay();
        if (mounted) {
          setDisplay(data);
          setName(data.name);
          setSettings(data.settings);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load display');
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [fetchDisplay]);

  const handleSave = async () => {
    if (!display) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const { error: updateError } = await supabase
      .from('displays')
      .update({
        name: name.trim(),
        settings: settings,
      })
      .eq('id', display.id);

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccessMessage('Settings saved successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRegenerateToken = async () => {
    if (!display) return;

    setIsRegenerating(true);
    setError(null);

    // Generate new secure token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const newToken = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');

    const { error: updateError } = await supabase
      .from('displays')
      .update({ auth_token: newToken })
      .eq('id', display.id);

    setIsRegenerating(false);
    setShowRegenerateConfirm(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Update local state with new token
    setDisplay({ ...display, auth_token: newToken });
    setSuccessMessage('Token regenerated. The display will need to be set up again.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const getSetupUrl = (token: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/setup?token=${token}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateWidget = (widget: keyof DisplaySettings['widgetsEnabled'], enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      widgetsEnabled: { ...prev.widgetsEnabled, [widget]: enabled },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-muted h-8 w-64 animate-pulse rounded" />
        <div className="bg-muted h-96 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error && !display) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">{error}</div>
      </div>
    );
  }

  if (!display) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground p-2 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-full p-2">
            <Monitor className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-foreground text-2xl font-semibold">Display Settings</h1>
            <p className="text-muted-foreground">Configure {display.name}</p>
          </div>
        </div>
      </div>

      {error && <div className="bg-destructive/10 text-destructive rounded-lg p-4">{error}</div>}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-green-500/10 p-4 text-green-600"
        >
          {successMessage}
        </motion.div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Display Name */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Display Name</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Kitchen Display"
            className="bg-background border-input focus:ring-ring w-full max-w-md rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Theme */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Theme</h2>
          <div className="flex flex-wrap gap-3">
            {(['light', 'dark', 'auto'] as DisplayTheme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => updateSetting('theme', theme)}
                className={`rounded-lg border px-4 py-2 transition-colors ${
                  settings.theme === theme
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Auto will follow system preference or time of day
          </p>
        </div>

        {/* Layout */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Layout</h2>
          <div className="flex flex-wrap gap-3">
            {(['calendar', 'agenda', 'split'] as DisplayLayout[]).map((layout) => (
              <button
                key={layout}
                onClick={() => updateSetting('layout', layout)}
                className={`rounded-lg border px-4 py-2 transition-colors ${
                  settings.layout === layout
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Widgets</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.widgetsEnabled.clock}
                onChange={(e) => updateWidget('clock', e.target.checked)}
                className="h-5 w-5 rounded"
              />
              <span>Clock</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.widgetsEnabled.upcomingEvents}
                onChange={(e) => updateWidget('upcomingEvents', e.target.checked)}
                className="h-5 w-5 rounded"
              />
              <span>Upcoming Events Sidebar</span>
            </label>
            <label className="text-muted-foreground flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.widgetsEnabled.weather}
                onChange={(e) => updateWidget('weather', e.target.checked)}
                disabled
                className="h-5 w-5 rounded"
              />
              <span>Weather (coming soon)</span>
            </label>
          </div>
        </div>

        {/* Time Format */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Time Format</h2>
          <div className="flex gap-3">
            <button
              onClick={() => updateSetting('use24HourTime', false)}
              className={`rounded-lg border px-4 py-2 transition-colors ${
                !settings.use24HourTime
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              12-hour (3:00 PM)
            </button>
            <button
              onClick={() => updateSetting('use24HourTime', true)}
              className={`rounded-lg border px-4 py-2 transition-colors ${
                settings.use24HourTime
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              24-hour (15:00)
            </button>
          </div>
        </div>

        {/* Scheduled Reload */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Daily Reload Time</h2>
          <input
            type="time"
            value={settings.scheduledReloadTime}
            onChange={(e) => updateSetting('scheduledReloadTime', e.target.value)}
            className="bg-background border-input focus:ring-ring rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
          />
          <p className="text-muted-foreground mt-2 text-sm">
            The display will automatically refresh at this time to prevent memory issues
          </p>
        </div>

        {/* Visual Effects */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Visual Effects</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.burnInPreventionEnabled}
                onChange={(e) => updateSetting('burnInPreventionEnabled', e.target.checked)}
                className="h-5 w-5 rounded"
              />
              <div>
                <span>Burn-in Prevention</span>
                <p className="text-muted-foreground text-sm">
                  Subtle pixel shifting to prevent screen burn-in
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.ambientAnimationEnabled}
                onChange={(e) => updateSetting('ambientAnimationEnabled', e.target.checked)}
                className="h-5 w-5 rounded"
              />
              <div>
                <span>Ambient Background</span>
                <p className="text-muted-foreground text-sm">
                  Slow gradient animation for a living, calming feel
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card border-border rounded-lg border p-6">
          <h2 className="text-foreground mb-4 font-medium">Security</h2>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium">Setup URL</div>
              <div className="flex items-center gap-2">
                <code className="bg-muted text-muted-foreground flex-1 truncate rounded px-3 py-2 font-mono text-sm">
                  {getSetupUrl(display.auth_token)}
                </code>
                <button
                  onClick={() => copyToClipboard(getSetupUrl(display.auth_token))}
                  className="text-muted-foreground hover:text-foreground p-2 transition-colors"
                  aria-label="Copy setup URL"
                >
                  {copiedUrl ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="border-border border-t pt-4">
              <div className="mb-2 text-sm font-medium">Regenerate Token</div>
              <p className="text-muted-foreground mb-3 text-sm">
                If you suspect your display token has been compromised, regenerate it. The display
                will disconnect and need to be set up again.
              </p>
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="text-destructive hover:bg-destructive/10 border-destructive/50 inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate Token
              </button>
            </div>
          </div>
        </div>

        {/* Regenerate Token Confirmation Modal */}
        <AnimatePresence>
          {showRegenerateConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
              onClick={() => setShowRegenerateConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border-border mx-4 w-full max-w-md rounded-lg border p-6 shadow-lg"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-destructive/10 rounded-full p-2">
                    <AlertTriangle className="text-destructive h-6 w-6" />
                  </div>
                  <h3 className="text-foreground text-lg font-medium">Regenerate Token?</h3>
                </div>

                <p className="text-muted-foreground mb-6">
                  This will immediately invalidate the current token. The display will show an error
                  and will need to be set up again with the new setup URL.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRegenerateToken}
                    disabled={isRegenerating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="text-muted-foreground hover:text-foreground px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </motion.button>

          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisplaySettingsClient({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="bg-muted h-8 w-64 animate-pulse rounded" />
          <div className="bg-muted h-96 animate-pulse rounded-lg" />
        </div>
      }
    >
      <DisplaySettingsContent params={params} />
    </Suspense>
  );
}
