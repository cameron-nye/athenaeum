'use client';

/**
 * Photos dashboard page showing photo grid with upload functionality
 * REQ-4-005: Create photos dashboard page
 * REQ-4-009: Create photo detail modal
 * REQ-4-030: Optimize photo grid loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import {
  Image as ImageIcon,
  Plus,
  X,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Folder,
  Loader2,
  ChevronDown,
  FolderPlus,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotoUpload } from '@/components/photos/PhotoUpload';
import { getThumbnailUrl, getMediumUrl } from '@/lib/photos/urls';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface Photo {
  id: string;
  storage_path: string;
  filename: string;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  album: string | null;
  enabled: boolean;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
  },
} as const;

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
} as const;

function PhotoGrid({
  photos,
  onPhotoClick,
  onToggleEnabled,
  selectionMode,
  selectedIds,
  onToggleSelection,
}: {
  photos: Photo[];
  onPhotoClick: (index: number) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const handleImageLoad = useCallback((photoId: string) => {
    setLoadedImages((prev) => new Set([...prev, photoId]));
  }, []);

  const handleClick = useCallback(
    (photo: Photo, index: number) => {
      if (selectionMode) {
        onToggleSelection(photo.id);
      } else {
        onPhotoClick(index);
      }
    },
    [selectionMode, onToggleSelection, onPhotoClick]
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {photos.map((photo, index) => {
        const isSelected = selectedIds.has(photo.id);
        return (
          <motion.div
            key={photo.id}
            variants={itemVariants}
            className="group relative aspect-square"
          >
            {/* Skeleton */}
            {!loadedImages.has(photo.id) && (
              <div className="animate-shimmer absolute inset-0 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
            )}

            {/* Image */}
            <button
              type="button"
              onClick={() => handleClick(photo, index)}
              className="h-full w-full"
            >
              <img
                ref={(el) => {
                  if (el) observerRef.current?.observe(el);
                }}
                data-src={getThumbnailUrl(photo.storage_path)}
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                alt={photo.filename}
                onLoad={() => handleImageLoad(photo.id)}
                className={cn(
                  'h-full w-full rounded-lg object-cover transition-all duration-300',
                  loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0',
                  !photo.enabled && 'opacity-50 grayscale',
                  selectionMode && isSelected && 'ring-primary-500 ring-4 ring-offset-2'
                )}
              />
            </button>

            {/* Selection checkbox overlay */}
            {selectionMode && (
              <div className="absolute top-2 left-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(photo.id);
                  }}
                  className={cn(
                    'rounded-md p-0.5 transition-colors',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/80 text-neutral-600 hover:bg-white'
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </div>
            )}

            {/* Overlay */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity',
                selectionMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
              )}
            />

            {/* Actions - only show when not in selection mode */}
            {!selectionMode && (
              <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled(photo.id, !photo.enabled);
                  }}
                  className={cn(
                    'rounded-full p-1.5 backdrop-blur-sm transition-colors',
                    photo.enabled
                      ? 'bg-white/80 text-neutral-700 hover:bg-white'
                      : 'bg-amber-500/80 text-white hover:bg-amber-500'
                  )}
                  title={photo.enabled ? 'Disable photo' : 'Enable photo'}
                >
                  {photo.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Disabled badge */}
            {!photo.enabled && !selectionMode && (
              <div className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
                Hidden
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function PhotoModal({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  onToggleEnabled,
  albums,
  onAssignAlbum,
}: {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  albums: string[];
  onAssignAlbum: (id: string, album: string | null) => void;
}) {
  const photo = photos[currentIndex];
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate('prev');
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate('next');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose, onNavigate]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(photo.id);
        if (photos.length === 1) {
          onClose();
        } else if (currentIndex >= photos.length - 1) {
          onNavigate('prev');
        }
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={photo.id}
              src={getMediumUrl(photo.storage_path)}
              alt={photo.filename}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          </AnimatePresence>

          {/* Navigation */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('prev')}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {currentIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={() => onNavigate('next')}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Info bar */}
        <div className="mt-4 rounded-lg bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium text-white">{photo.filename}</h3>
              <div className="mt-1 flex items-center gap-4 text-sm text-white/70">
                {photo.taken_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(photo.taken_at).toLocaleDateString()}
                  </span>
                )}
                {photo.album && (
                  <span className="flex items-center gap-1">
                    <Folder className="h-4 w-4" />
                    {photo.album}
                  </span>
                )}
                <span className="text-white/50">
                  {currentIndex + 1} / {photos.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Album picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAlbumPicker(!showAlbumPicker)}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  title="Assign to album"
                >
                  <Folder className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showAlbumPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 bottom-full mb-2 w-48 rounded-lg border border-white/20 bg-neutral-800/95 py-1 shadow-lg backdrop-blur"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onAssignAlbum(photo.id, null);
                          setShowAlbumPicker(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10',
                          photo.album === null && 'text-primary-400'
                        )}
                      >
                        {photo.album === null && <Check className="h-4 w-4" />}
                        <span className={photo.album === null ? '' : 'pl-6'}>No Album</span>
                      </button>
                      {albums.map((album) => (
                        <button
                          key={album}
                          type="button"
                          onClick={() => {
                            onAssignAlbum(photo.id, album);
                            setShowAlbumPicker(false);
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10',
                            photo.album === album && 'text-primary-400'
                          )}
                        >
                          {photo.album === album && <Check className="h-4 w-4" />}
                          <span className={photo.album === album ? '' : 'pl-6'}>{album}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => onToggleEnabled(photo.id, !photo.enabled)}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  photo.enabled
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                )}
                title={photo.enabled ? 'Hide from slideshow' : 'Show in slideshow'}
              >
                {photo.enabled ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">Delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  title="Delete photo"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    </motion.div>
  );
}

// Album filter dropdown component
function AlbumFilter({
  albums,
  selectedAlbum,
  onSelectAlbum,
  onCreateAlbum,
}: {
  albums: string[];
  selectedAlbum: string | null;
  onSelectAlbum: (album: string | null) => void;
  onCreateAlbum: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      >
        <Folder className="h-4 w-4 text-neutral-500" />
        <span className="text-neutral-700 dark:text-neutral-200">
          {selectedAlbum || 'All Photos'}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-neutral-500 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          >
            <button
              type="button"
              onClick={() => {
                onSelectAlbum(null);
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                selectedAlbum === null &&
                  'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
              )}
            >
              {selectedAlbum === null && <Check className="h-4 w-4" />}
              <span className={selectedAlbum === null ? '' : 'pl-6'}>All Photos</span>
            </button>

            {albums.length > 0 && (
              <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            )}

            {albums.map((album) => (
              <button
                key={album}
                type="button"
                onClick={() => {
                  onSelectAlbum(album);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  selectedAlbum === album &&
                    'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                )}
              >
                {selectedAlbum === album && <Check className="h-4 w-4" />}
                <span className={selectedAlbum === album ? '' : 'pl-6'}>{album}</span>
              </button>
            ))}

            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

            <button
              type="button"
              onClick={() => {
                onCreateAlbum();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              <FolderPlus className="h-4 w-4" />
              New Album
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Create album dialog inner content (resets when key changes)
function CreateAlbumDialogContent({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
        Create New Album
      </h3>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Album name"
          className="focus:border-primary-500 focus:ring-primary-500 mb-4 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 placeholder-neutral-400 focus:ring-1 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-white dark:placeholder-neutral-500"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// Create album dialog component
function CreateAlbumDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <CreateAlbumDialogContent onClose={onClose} onCreate={onCreate} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Bulk action bar component
function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkEnable,
  onBulkDisable,
  onBulkAssignAlbum,
  albums,
  onExit,
  isProcessing,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkAssignAlbum: (album: string | null) => void;
  albums: string[];
  onExit: () => void;
  isProcessing: boolean;
}) {
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAlbumDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="sticky top-0 z-50 mb-4 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {selectedCount} of {totalCount} selected
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isProcessing}
            className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={isProcessing}
            className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Bulk enable/disable */}
        <button
          type="button"
          onClick={onBulkEnable}
          disabled={isProcessing || selectedCount === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
          title="Enable selected"
        >
          <Eye className="h-4 w-4" />
          Enable
        </button>
        <button
          type="button"
          onClick={onBulkDisable}
          disabled={isProcessing || selectedCount === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
          title="Disable selected"
        >
          <EyeOff className="h-4 w-4" />
          Disable
        </button>

        {/* Album dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            disabled={isProcessing || selectedCount === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <Folder className="h-4 w-4" />
            Album
            <ChevronDown className="h-3 w-3" />
          </button>
          <AnimatePresence>
            {showAlbumDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 z-50 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
              >
                <button
                  type="button"
                  onClick={() => {
                    onBulkAssignAlbum(null);
                    setShowAlbumDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Remove from Album
                </button>
                {albums.length > 0 && (
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
                )}
                {albums.map((album) => (
                  <button
                    key={album}
                    type="button"
                    onClick={() => {
                      onBulkAssignAlbum(album);
                      setShowAlbumDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    {album}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete */}
        {showConfirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Delete?</span>
            <button
              type="button"
              onClick={() => {
                onBulkDelete();
                setShowConfirmDelete(false);
              }}
              disabled={isProcessing}
              className="rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              className="rounded bg-neutral-200 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            disabled={isProcessing || selectedCount === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}

        {/* Exit selection mode */}
        <button
          type="button"
          onClick={onExit}
          className="ml-2 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="Exit selection mode"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function PhotosPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ photos: Photo[] }>('/api/photos', fetcher);

  const allPhotos = data?.photos || [];

  // Get unique album names
  const albums = Array.from(new Set(allPhotos.filter((p) => p.album).map((p) => p.album!)));

  // Filter photos by selected album
  const photos = selectedAlbum ? allPhotos.filter((p) => p.album === selectedAlbum) : allPhotos;

  // Handle creating new album (just stores the name, actual assignment happens later)
  const handleCreateAlbum = useCallback((name: string) => {
    // Albums are created implicitly when assigning photos to them
    // For now, we'll just switch to showing that album (empty until photos are added)
    setSelectedAlbum(name);
  }, []);

  // Handle assigning photo to album
  const handleAssignAlbum = useCallback(
    async (id: string, album: string | null) => {
      // Optimistic update
      mutate({ photos: allPhotos.map((p) => (p.id === id ? { ...p, album } : p)) }, false);

      try {
        await fetch(`/api/photos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album }),
        });
        mutate(); // Refetch to get accurate album list
      } catch {
        mutate(); // Revert on error
      }
    },
    [allPhotos, mutate]
  );

  const handleUploadComplete = useCallback(() => {
    mutate();
    setShowUpload(false);
  }, [mutate]);

  const handleToggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      // Optimistic update
      mutate(
        {
          photos: allPhotos.map((p) => (p.id === id ? { ...p, enabled } : p)),
        },
        false
      );

      try {
        await fetch(`/api/photos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
      } catch {
        // Revert on error
        mutate();
      }
    },
    [allPhotos, mutate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      mutate({ photos: allPhotos.filter((p) => p.id !== id) }, false);
    },
    [allPhotos, mutate]
  );

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (selectedIndex === null) return;
      const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
      if (newIndex >= 0 && newIndex < photos.length) {
        setSelectedIndex(newIndex);
      }
    },
    [selectedIndex, photos.length]
  );

  // Selection mode handlers
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(photos.map((p) => p.id)));
  }, [photos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    // Optimistic update
    mutate({ photos: allPhotos.filter((p) => !selectedIds.has(p.id)) }, false);

    try {
      // Delete photos in parallel
      await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/photos/${id}`, { method: 'DELETE' }))
      );
      setSelectedIds(new Set());
      mutate();
    } catch {
      mutate(); // Revert on error
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, allPhotos, mutate]);

  const handleBulkEnable = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    // Optimistic update
    mutate(
      {
        photos: allPhotos.map((p) => (selectedIds.has(p.id) ? { ...p, enabled: true } : p)),
      },
      false
    );

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/photos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
          })
        )
      );
      mutate();
    } catch {
      mutate();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, allPhotos, mutate]);

  const handleBulkDisable = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);

    // Optimistic update
    mutate(
      {
        photos: allPhotos.map((p) => (selectedIds.has(p.id) ? { ...p, enabled: false } : p)),
      },
      false
    );

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/photos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false }),
          })
        )
      );
      mutate();
    } catch {
      mutate();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, allPhotos, mutate]);

  const handleBulkAssignAlbum = useCallback(
    async (album: string | null) => {
      if (selectedIds.size === 0) return;
      setIsBulkProcessing(true);

      // Optimistic update
      mutate(
        {
          photos: allPhotos.map((p) => (selectedIds.has(p.id) ? { ...p, album } : p)),
        },
        false
      );

      try {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            fetch(`/api/photos/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ album }),
            })
          )
        );
        mutate();
      } catch {
        mutate();
      } finally {
        setIsBulkProcessing(false);
      }
    },
    [selectedIds, allPhotos, mutate]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl bg-gradient-to-br p-2">
                <ImageIcon className="text-primary-600 dark:text-primary-400 h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Photos
                </h1>
                <p className="text-sm text-neutral-500">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Album filter */}
              <AlbumFilter
                albums={albums}
                selectedAlbum={selectedAlbum}
                onSelectAlbum={setSelectedAlbum}
                onCreateAlbum={() => setShowCreateAlbum(true)}
              />

              {/* Select button */}
              {photos.length > 0 && !selectionMode && (
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select
                </button>
              )}

              <motion.button
                type="button"
                onClick={() => setShowUpload(!showUpload)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors',
                  showUpload
                    ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                )}
              >
                {showUpload ? (
                  <>
                    <X className="h-5 w-5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Upload
                  </>
                )}
              </motion.button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Upload section */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <PhotoUpload onUploadComplete={handleUploadComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
              <p className="text-neutral-500">Loading photos...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="mb-4 text-red-600">Failed to load photos</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && photos.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="mb-6 rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
              <ImageIcon className="h-12 w-12 text-neutral-400" />
            </div>
            <h2 className="mb-2 text-xl font-medium text-neutral-700 dark:text-neutral-200">
              No photos yet
            </h2>
            <p className="mb-6 text-neutral-500">Upload your first photo to get started</p>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white"
            >
              <Plus className="h-5 w-5" />
              Upload Photos
            </button>
          </motion.div>
        )}

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectionMode && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              totalCount={photos.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkDelete={handleBulkDelete}
              onBulkEnable={handleBulkEnable}
              onBulkDisable={handleBulkDisable}
              onBulkAssignAlbum={handleBulkAssignAlbum}
              albums={albums}
              onExit={handleExitSelectionMode}
              isProcessing={isBulkProcessing}
            />
          )}
        </AnimatePresence>

        {/* Photo grid */}
        {!isLoading && !error && photos.length > 0 && (
          <PhotoGrid
            photos={photos}
            onPhotoClick={setSelectedIndex}
            onToggleEnabled={handleToggleEnabled}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
          />
        )}

        {/* Photo modal */}
        <AnimatePresence>
          {selectedIndex !== null && (
            <PhotoModal
              photos={photos}
              currentIndex={selectedIndex}
              onClose={() => setSelectedIndex(null)}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
              onToggleEnabled={handleToggleEnabled}
              albums={albums}
              onAssignAlbum={handleAssignAlbum}
            />
          )}
        </AnimatePresence>

        {/* Create album dialog */}
        <CreateAlbumDialog
          isOpen={showCreateAlbum}
          onClose={() => setShowCreateAlbum(false)}
          onCreate={handleCreateAlbum}
        />
      </main>
    </div>
  );
}
