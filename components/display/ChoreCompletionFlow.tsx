'use client';

/**
 * ChoreCompletionFlow Component
 * Multi-step completion flow: swipe confirms -> select who completed
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, PartyPopper } from 'lucide-react';
import { FamilyMemberGrid } from './FamilyMemberGrid';
import { CompletionCelebration } from './CompletionCelebration';
import { useCompletionFlow, type ChoreAssignment, type HouseholdMember } from './DisplayContext';

interface ChoreCompletionFlowProps {
  assignment: ChoreAssignment;
  householdMembers: HouseholdMember[];
  onClose: () => void;
}

export function ChoreCompletionFlow({
  assignment,
  householdMembers,
  onClose,
}: ChoreCompletionFlowProps) {
  const { cancel } = useCompletionFlow();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedPoints, setCompletedPoints] = useState(0);

  const handleMemberSelect = useCallback(
    async (memberId: string) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/display/chores/assignments/${assignment.id}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed_by: memberId }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete chore');
        }

        // Show celebration
        setCompletedPoints(assignment.chore.points);
        setShowCelebration(true);

        // Close after celebration
        setTimeout(() => {
          cancel();
        }, 2500);
      } catch (error) {
        console.error('Error completing chore:', error);
        setIsSubmitting(false);
      }
    },
    [assignment, isSubmitting, cancel]
  );

  if (showCelebration) {
    return (
      <CompletionCelebration
        choreName={assignment.chore.title}
        points={completedPoints}
        onComplete={cancel}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 pb-8 pt-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">
              {assignment.chore.icon || '✨'}
            </div>
            <div>
              <div className="text-sm font-medium text-green-100">Completing</div>
              <div className="text-xl font-bold">{assignment.chore.title}</div>
            </div>
          </div>
          {assignment.chore.points > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium">
              <PartyPopper className="h-4 w-4" />
              +{assignment.chore.points} points
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 text-center text-lg font-medium text-neutral-700 dark:text-neutral-200">
            Who completed this chore?
          </div>

          <FamilyMemberGrid
            members={householdMembers}
            onSelect={handleMemberSelect}
            disabled={isSubmitting}
          />

          {isSubmitting && (
            <div className="mt-4 text-center text-sm text-neutral-500">Saving...</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
