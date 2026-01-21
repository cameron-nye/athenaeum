'use client';

/**
 * CreateChorePanel Component
 * Slide-up panel for creating chores directly from the display
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, User, Star } from 'lucide-react';
import { IconSelector } from '@/components/chores/IconSelector';
import { FamilyMemberGrid } from './FamilyMemberGrid';
import type { HouseholdMember } from './DisplayContext';

interface CreateChorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  householdMembers: HouseholdMember[];
  onCreated?: () => void;
}

type Step = 'title' | 'icon' | 'points' | 'assign' | 'date';

export function CreateChorePanel({
  isOpen,
  onClose,
  householdMembers,
  onCreated,
}: CreateChorePanelProps) {
  const [step, setStep] = useState<Step>('title');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep('title');
    setTitle('');
    setIcon(null);
    setPoints(0);
    setAssignedTo(null);
    setDueDate(new Date().toISOString().split('T')[0]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the chore
      const choreResponse = await fetch('/api/display/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          points,
        }),
      });

      if (!choreResponse.ok) {
        throw new Error('Failed to create chore');
      }

      const { chore } = await choreResponse.json();

      // Create assignment
      const assignmentResponse = await fetch('/api/display/chores/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chore_id: chore.id,
          assigned_to: assignedTo,
          due_date: dueDate,
        }),
      });

      if (!assignmentResponse.ok) {
        throw new Error('Failed to create assignment');
      }

      handleClose();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, icon, points, assignedTo, dueDate, handleClose, onCreated]);

  const goNext = useCallback(() => {
    const steps: Step[] = ['title', 'icon', 'points', 'assign', 'date'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleSubmit();
    }
  }, [step, handleSubmit]);

  const goBack = useCallback(() => {
    const steps: Step[] = ['title', 'icon', 'points', 'assign', 'date'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [step]);

  const canProceed = step === 'title' ? title.trim().length > 0 : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-neutral-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
              <button
                onClick={step === 'title' ? handleClose : goBack}
                className="text-neutral-500 hover:text-neutral-700"
              >
                {step === 'title' ? (
                  <X className="h-6 w-6" />
                ) : (
                  <span className="text-sm font-medium">Back</span>
                )}
              </button>

              <div className="text-center">
                <div className="text-lg font-semibold">New Chore</div>
                <div className="text-xs text-neutral-500">
                  Step {['title', 'icon', 'points', 'assign', 'date'].indexOf(step) + 1} of 5
                </div>
              </div>

              <button
                onClick={goNext}
                disabled={!canProceed || isSubmitting}
                className={`font-medium ${
                  canProceed && !isSubmitting
                    ? 'text-blue-500 hover:text-blue-600'
                    : 'text-neutral-300'
                }`}
              >
                {step === 'date' ? (isSubmitting ? 'Saving...' : 'Done') : 'Next'}
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              {error && (
                <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</div>
              )}

              <AnimatePresence mode="wait">
                {step === 'title' && (
                  <motion.div
                    key="title"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        What needs to be done?
                      </span>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Take out the trash"
                        autoFocus
                        className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </label>
                  </motion.div>
                )}

                {step === 'icon' && (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Choose an icon (optional)
                    </div>
                    <IconSelector
                      value={icon}
                      onChange={setIcon}
                    />
                  </motion.div>
                )}

                {step === 'points' && (
                  <motion.div
                    key="points"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      How many points is this worth?
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[0, 1, 2, 3, 5, 10].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPoints(p)}
                          className={`flex h-16 w-16 items-center justify-center rounded-xl text-lg font-bold transition-all ${
                            points === p
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          {p === 0 ? (
                            <span className="text-sm">None</span>
                          ) : (
                            <>
                              <Star className="mr-1 h-4 w-4" />
                              {p}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 'assign' && (
                  <motion.div
                    key="assign"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Assign to someone (optional)
                    </div>
                    <div className="mb-4">
                      <button
                        onClick={() => setAssignedTo(null)}
                        className={`mb-4 w-full rounded-xl px-4 py-3 text-left transition-all ${
                          assignedTo === null
                            ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/30'
                            : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-neutral-500" />
                          <span className="font-medium">Anyone can do it</span>
                        </div>
                      </button>
                    </div>
                    <FamilyMemberGrid
                      members={householdMembers}
                      onSelect={(id) => setAssignedTo(id)}
                      selectedId={assignedTo}
                      size="md"
                    />
                  </motion.div>
                )}

                {step === 'date' && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      When is it due?
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const today = new Date();
                        const dates = [
                          { label: 'Today', date: today },
                          {
                            label: 'Tomorrow',
                            date: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                          },
                          {
                            label: 'In 3 days',
                            date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
                          },
                          {
                            label: 'In a week',
                            date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
                          },
                        ];

                        return dates.map(({ label, date }) => {
                          const dateStr = date.toISOString().split('T')[0];
                          return (
                            <button
                              key={label}
                              onClick={() => setDueDate(dateStr)}
                              className={`flex items-center gap-2 rounded-xl px-4 py-3 transition-all ${
                                dueDate === dateStr
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200'
                              }`}
                            >
                              <Calendar className="h-4 w-4" />
                              {label}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    <div className="mt-4">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Safe area padding */}
            <div className="h-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
