'use client';

/**
 * Google Photos Connection Page
 * REQ-4-025: Create Google Photos connection page
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cloud, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Suspense } from 'react';

interface PhotoSource {
  id: string;
  album_id: string;
  album_name: string;
  album_cover_url: string | null;
  photo_count: number;
  enabled: boolean;
  last_synced_at: string | null;
}

function ErrorHandler() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  const errorMessages: Record<string, string> = {
    oauth_denied: 'Google Photos access was denied.',
    invalid_callback: 'Invalid callback from Google.',
    invalid_state: 'Security validation failed. Please try again.',
    csrf_failed: 'Security check failed. Please try again.',
    no_refresh_token: 'Could not get persistent access. Please try again.',
    no_household: 'You must be part of a household to connect Google Photos.',
    no_albums: 'No albums found in your Google Photos library.',
    db_error: 'Failed to save album data. Please try again.',
    callback_failed: 'Connection failed. Please try again.',
    sync_failed: 'Failed to sync photos. Please try again.',
  };

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-300">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <p>{errorMessages[error] || 'An error occurred.'}</p>
    </div>
  );
}

function GooglePhotosContent() {
  const router = useRouter();
  const [sources, setSources] = useState<PhotoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      const response = await fetch('/api/photos/sources');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSources(data.sources || []);

      // Pre-select already enabled albums
      const enabled = new Set<string>();
      for (const source of data.sources || []) {
        if (source.enabled) {
          enabled.add(source.id);
        }
      }
      setSelectedAlbums(enabled);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAlbum(id: string) {
    setSelectedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedAlbums(new Set(sources.map((s) => s.id)));
  }

  function deselectAll() {
    setSelectedAlbums(new Set());
  }

  async function saveSelection() {
    setSaving(true);
    try {
      // Update enabled status for all sources
      const updates = sources.map((source) => ({
        id: source.id,
        enabled: selectedAlbums.has(source.id),
      }));

      const response = await fetch('/api/photos/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to save');

      // Trigger sync for newly enabled albums
      const newlyEnabled = sources.filter(
        (s) => selectedAlbums.has(s.id) && !s.enabled && !s.last_synced_at
      );

      for (const source of newlyEnabled) {
        await syncAlbum(source.id);
      }

      router.push('/photos');
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  }

  async function syncAlbum(id: string) {
    setSyncing(id);
    try {
      const response = await fetch('/api/photos/sources/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: id }),
      });

      if (!response.ok) throw new Error('Failed to sync');

      // Refresh sources to get updated sync time
      await fetchSources();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ErrorHandler />
      </Suspense>

      {sources.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <Cloud className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
          <h3 className="mb-2 text-lg font-medium">Connect Google Photos</h3>
          <p className="mb-4 text-neutral-500 dark:text-neutral-400">
            Import photos from your Google Photos albums to display on your wall display.
          </p>
          <Link
            href="/api/google/photos/auth"
            className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white"
          >
            <Cloud className="h-4 w-4" />
            Connect Google Photos
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Deselect All
              </button>
            </div>
            <span className="text-sm text-neutral-500">
              {selectedAlbums.size} of {sources.length} selected
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  selectedAlbums.has(source.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800'
                }`}
                onClick={() => toggleAlbum(source.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                    {source.album_cover_url ? (
                      <img
                        src={`${source.album_cover_url}=w64-h64-c`}
                        alt={source.album_name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium">{source.album_name}</h4>
                    <p className="text-sm text-neutral-500">
                      {source.photo_count} photo{source.photo_count !== 1 ? 's' : ''}
                    </p>
                    {source.last_synced_at && (
                      <p className="text-xs text-neutral-400">
                        Last synced: {new Date(source.last_synced_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedAlbums.has(source.id)}
                    onChange={() => toggleAlbum(source.id)}
                    className="h-4 w-4 rounded border-neutral-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {syncing === source.id && (
                  <div className="text-primary-600 mt-2 flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <Link
              href="/api/google/photos/auth"
              className="rounded-lg border border-neutral-200 px-4 py-2 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Refresh Albums
            </Link>
            <div className="flex gap-2">
              <Link
                href="/photos"
                className="rounded-lg px-4 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancel
              </Link>
              <button
                onClick={saveSelection}
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-white disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Sync'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function GooglePhotosPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link
          href="/photos"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Photos
        </Link>
        <h1 className="text-2xl font-semibold">Google Photos</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Select albums to sync with your display.
        </p>
      </div>

      <GooglePhotosContent />
    </div>
  );
}
