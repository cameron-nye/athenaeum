'use client';

/**
 * QuickAssign component for quickly assigning a chore to a family member.
 * REQ-5-027: Create quick-assign from chore list
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, Loader2, Calendar } from 'lucide-react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface HouseholdMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface QuickAssignProps {
  choreId: string;
  onAssigned?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function QuickAssign({ choreId, onAssigned }: QuickAssignProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch household members
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  const members = membersData?.members ?? [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedMember) return;

    setIsAssigning(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate =
        selectedDate === 'today' ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const res = await fetch('/api/chores/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chore_id: choreId,
          assigned_to: selectedMember,
          due_date: formatDate(dueDate),
        }),
      });

      if (res.ok) {
        setShowSuccess(true);
        setIsOpen(false);
        setSelectedMember(null);
        setSelectedDate('today');

        // Hide success after 2 seconds
        setTimeout(() => setShowSuccess(false), 2000);

        onAssigned?.();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm',
          'transition-all duration-200',
          showSuccess
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300'
        )}
      >
        {showSuccess ? (
          <>
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Assigned!</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Assign</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()} // Prevent card click
            className={cn(
              'absolute top-full right-0 z-50 mt-2 w-64 rounded-xl border py-2 shadow-xl',
              'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            )}
          >
            {/* Date selector */}
            <div className="mb-2 border-b border-gray-100 px-3 pb-2 dark:border-gray-700">
              <div className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                Due date
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedDate('today')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-sm',
                    selectedDate === 'today'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate('tomorrow')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-sm',
                    selectedDate === 'tomorrow'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Member list */}
            <div className="px-1">
              <div className="mb-1.5 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Assign to
              </div>

              {members.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">Loading members...</div>
              ) : (
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() =>
                        setSelectedMember(selectedMember === member.id ? null : member.id)
                      }
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5',
                        'transition-colors duration-150',
                        selectedMember === member.id
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <UserAvatar
                        name={member.display_name || member.email}
                        avatarUrl={member.avatar_url}
                        size="xs"
                      />
                      <span className="flex-1 truncate text-left text-sm">
                        {member.display_name || member.email}
                      </span>
                      {selectedMember === member.id && (
                        <Check className="h-4 w-4 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assign button */}
            <div className="mt-2 border-t border-gray-100 px-3 pt-2 dark:border-gray-700">
              <button
                onClick={handleAssign}
                disabled={!selectedMember || isAssigning}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg py-2',
                  'bg-gradient-to-r from-indigo-500 to-purple-500',
                  'hover:from-indigo-600 hover:to-purple-600',
                  'font-medium text-white',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-all duration-200'
                )}
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Assign Chore
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
