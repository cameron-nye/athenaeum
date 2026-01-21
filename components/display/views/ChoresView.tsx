'use client';

/**
 * ChoresView Component
 * Full chores management view with interactive list
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Filter, User, Users } from 'lucide-react';
import { useDisplayContext } from '../DisplayContext';
import { InteractiveChoreList } from '../InteractiveChoreList';
import { CreateChorePanel } from '../CreateChorePanel';
import { TextShimmer } from '@/components/motion-primitives/text-shimmer';

interface ChoresViewProps {
  householdMembers: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
}

export function ChoresView({ householdMembers }: ChoresViewProps) {
  const { state } = useDisplayContext();
  const { choreAssignments } = state;
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Filter assignments by selected member
  const filteredAssignments = useMemo(() => {
    if (!selectedMemberFilter) return choreAssignments;
    return choreAssignments.filter((a) => a.assigned_to === selectedMemberFilter);
  }, [choreAssignments, selectedMemberFilter]);

  // Count overdue chores
  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return choreAssignments.filter((a) => !a.completed_at && a.due_date < today).length;
  }, [choreAssignments]);

  // Count today's pending chores
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return choreAssignments.filter((a) => !a.completed_at && a.due_date === today).length;
  }, [choreAssignments]);

  const selectedMember = householdMembers.find((m) => m.id === selectedMemberFilter);

  return (
    <div className="flex h-full flex-col p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TextShimmer className="text-3xl font-bold" duration={3}>
            Chores
          </TextShimmer>

          {overdueCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-500"
            >
              {overdueCount} overdue
            </motion.div>
          )}

          {todayCount > 0 && (
            <div className="rounded-full bg-blue-500/20 px-3 py-1.5 text-sm font-medium text-blue-500">
              {todayCount} today
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex h-12 items-center gap-2 rounded-xl px-4 transition-colors ${
              selectedMemberFilter || showFilterPanel
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            {selectedMemberFilter ? (
              <>
                <User className="h-5 w-5" />
                <span>{selectedMember?.display_name || 'User'}</span>
              </>
            ) : (
              <>
                <Filter className="h-5 w-5" />
                <span>Filter</span>
              </>
            )}
          </button>

          {/* Create chore button */}
          <button
            onClick={() => setShowCreatePanel(true)}
            className="flex h-12 items-center gap-2 rounded-xl bg-blue-500 px-4 font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus className="h-5 w-5" />
            <span>Add Chore</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                <Users className="h-4 w-4" />
                Filter by person
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedMemberFilter(null);
                    setShowFilterPanel(false);
                  }}
                  className={`rounded-lg px-4 py-2 transition-colors ${
                    !selectedMemberFilter
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  All
                </button>
                {householdMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedMemberFilter(member.id);
                      setShowFilterPanel(false);
                    }}
                    className={`rounded-lg px-4 py-2 transition-colors ${
                      selectedMemberFilter === member.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {member.display_name || 'Unknown'}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chore list */}
      <div className="flex-1 overflow-hidden">
        <InteractiveChoreList
          assignments={filteredAssignments}
          householdMembers={householdMembers}
        />
      </div>

      {/* Create chore panel */}
      <CreateChorePanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        householdMembers={householdMembers}
      />
    </div>
  );
}
