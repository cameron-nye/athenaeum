'use client';

/**
 * Photo upload component with drag-and-drop support
 * REQ-4-006: Create photo upload component
 * REQ-4-031: Create photo upload progress indicator
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface PhotoUploadProps {
  onUploadComplete?: () => void;
  album?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function PhotoUpload({ onUploadComplete, album }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 10MB';
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const filesToAdd: UploadingFile[] = Array.from(newFiles).map((file) => {
      const error = validateFile(file);
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      } as UploadingFile;
    });

    setFiles((prev) => [...prev, ...filesToAdd]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFile = async (uploadingFile: UploadingFile): Promise<void> => {
    if (uploadingFile.status === 'error') return;

    setFiles((prev) =>
      prev.map((f) => (f.id === uploadingFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
    );

    const formData = new FormData();
    formData.append('file', uploadingFile.file);
    if (album) {
      formData.append('album', album);
    }

    try {
      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id ? { ...f, status: 'success', progress: 100 } : f
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadingFile.id
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    for (const file of pendingFiles) {
      if (abortControllerRef.current?.signal.aborted) break;
      await uploadFile(file);
    }

    setIsUploading(false);
    onUploadComplete?.();
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [addFiles]
  );

  const completedCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        className={cn(
          'relative rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-200',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="rounded-full bg-neutral-100 p-4 dark:bg-neutral-800"
            animate={{ y: isDragging ? -5 : 0 }}
          >
            <Upload className="h-8 w-8 text-neutral-500" />
          </motion.div>
          <div>
            <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
              Drop photos here
            </p>
            <p className="text-sm text-neutral-500">
              or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                browse files
              </button>
            </p>
          </div>
          <p className="text-xs text-neutral-400">JPEG, PNG, WebP, GIF up to 10MB</p>
        </div>
      </motion.div>

      {/* File list */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                {files.length} file{files.length !== 1 ? 's' : ''}
                {completedCount > 0 && (
                  <span className="text-green-600"> ({completedCount} uploaded)</span>
                )}
                {errorCount > 0 && <span className="text-red-600"> ({errorCount} failed)</span>}
              </span>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  Clear completed
                </button>
              )}
            </div>

            {/* File items */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg p-3',
                    file.status === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : file.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/50'
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {file.status === 'uploading' ? (
                      <Loader2 className="text-primary-500 h-5 w-5 animate-spin" />
                    ) : file.status === 'success' ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : file.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      {file.file.name}
                    </p>
                    {file.error ? (
                      <p className="text-xs text-red-600">{file.error}</p>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  {/* Remove button */}
                  {file.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isUploading ? (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startUpload}
                    disabled={pendingCount === 0}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                      pendingCount > 0
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'cursor-not-allowed bg-neutral-300'
                    )}
                  >
                    Upload {pendingCount > 0 ? `(${pendingCount})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
