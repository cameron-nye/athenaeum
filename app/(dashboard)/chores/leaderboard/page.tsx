'use client';

/**
 * Chore points leaderboard/summary page.
 * REQ-5-025: Create chore points summary
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Trophy, Medal, Star, TrendingUp, Loader2, ArrowLeft, Award, Flame } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ChoreInfo {
  id: string;
  title: string;
  icon: string | null;
  points: number;
}

interface UserInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface CompletedAssignment {
  id: string;
  chore_id: string;
  due_date: string;
  assigned_to: string | null;
  completed_at: string;
  chores: ChoreInfo;
  users: UserInfo | null;
}

interface HouseholdMember {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface MemberStats {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  choreCount: number;
  rank: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const podiumVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  }),
};

type TimePeriod = 'week' | 'month' | 'all';

function getDateRange(period: TimePeriod): { from: string; to: string } {
  const to = new Date();
  const from = new Date();

  switch (period) {
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from.setDate(from.getDate() - 30);
      break;
    case 'all':
      from.setFullYear(from.getFullYear() - 10);
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Medal className="h-6 w-6 text-amber-600" />;
    default:
      return <Star className="h-5 w-5 text-gray-400" />;
  }
}

function getRankBgColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-300 dark:border-yellow-700';
    case 2:
      return 'bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-300 dark:border-gray-600';
    case 3:
      return 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-300 dark:border-orange-700';
    default:
      return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  }
}

export default function ChoreLeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod]);

  // Fetch completed assignments
  const { data: assignmentsData, isLoading: assignmentsLoading } = useSWR<{
    assignments: CompletedAssignment[];
  }>(
    `/api/chores/assignments?status=completed&from=${dateRange.from}&to=${dateRange.to}`,
    fetcher,
    { revalidateOnFocus: true }
  );

  // Fetch household members
  const { data: membersData } = useSWR<{
    members: HouseholdMember[];
    current_user_id: string;
  }>('/api/household/members', fetcher);

  const members = membersData?.members ?? [];
  const assignments = assignmentsData?.assignments ?? [];

  // Calculate stats per member
  const memberStats = useMemo(() => {
    const statsMap = new Map<string, { points: number; count: number }>();

    // Initialize all members
    for (const member of members) {
      statsMap.set(member.id, { points: 0, count: 0 });
    }

    // Accumulate points from assignments
    for (const assignment of assignments) {
      if (assignment.assigned_to) {
        const existing = statsMap.get(assignment.assigned_to) || { points: 0, count: 0 };
        existing.points += assignment.chores.points || 0;
        existing.count += 1;
        statsMap.set(assignment.assigned_to, existing);
      }
    }

    // Convert to sorted array
    const stats: MemberStats[] = members.map((member) => {
      const data = statsMap.get(member.id) || { points: 0, count: 0 };
      return {
        id: member.id,
        name: member.display_name || member.email || 'Unknown',
        avatarUrl: member.avatar_url,
        totalPoints: data.points,
        choreCount: data.count,
        rank: 0,
      };
    });

    // Sort by points (descending)
    stats.sort((a, b) => b.totalPoints - a.totalPoints);

    // Assign ranks
    let currentRank = 1;
    for (let i = 0; i < stats.length; i++) {
      if (i > 0 && stats[i].totalPoints < stats[i - 1].totalPoints) {
        currentRank = i + 1;
      }
      stats[i].rank = currentRank;
    }

    return stats;
  }, [members, assignments]);

  // Total stats
  const totalStats = useMemo(() => {
    return {
      totalPoints: memberStats.reduce((sum, s) => sum + s.totalPoints, 0),
      totalChores: memberStats.reduce((sum, s) => sum + s.choreCount, 0),
    };
  }, [memberStats]);

  // Top 3 for podium display
  const topThree = memberStats.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-2">
            <Link
              href="/chores"
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See who&apos;s earning the most points!
              </p>
            </div>
          </div>

          {/* Time period toggle */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              {(['week', 'month', 'all'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                    timePeriod === period
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  )}
                >
                  {period === 'week' && 'This Week'}
                  {period === 'month' && 'This Month'}
                  {period === 'all' && 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Total stats */}
          <div className="mt-6 flex justify-center gap-6">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 dark:bg-amber-900/20">
              <Award className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {totalStats.totalPoints} points
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 dark:bg-green-900/20">
              <Flame className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-green-700 dark:text-green-300">
                {totalStats.totalChores} chores
              </span>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {assignmentsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Leaderboard */}
        {!assignmentsLoading && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Podium for top 3 */}
            {topThree.length > 0 && (
              <div className="mb-8 flex items-end justify-center gap-4">
                {/* 2nd place */}
                {topThree[1] && (
                  <motion.div
                    custom={1}
                    variants={podiumVariants}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-2 text-gray-400">
                      <Medal className="h-8 w-8" />
                    </div>
                    <UserAvatar
                      name={topThree[1].name}
                      avatarUrl={topThree[1].avatarUrl}
                      size="lg"
                    />
                    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {topThree[1].name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <Star className="h-3 w-3" />
                      {topThree[1].totalPoints}
                    </div>
                    <div className="mt-3 h-16 w-20 rounded-t-lg bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                  </motion.div>
                )}

                {/* 1st place */}
                {topThree[0] && (
                  <motion.div
                    custom={0}
                    variants={podiumVariants}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-2 text-yellow-500">
                      <Trophy className="h-10 w-10" />
                    </div>
                    <UserAvatar
                      name={topThree[0].name}
                      avatarUrl={topThree[0].avatarUrl}
                      size="xl"
                    />
                    <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                      {topThree[0].name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <Star className="h-4 w-4" />
                      {topThree[0].totalPoints}
                    </div>
                    <div className="mt-3 h-24 w-24 rounded-t-lg bg-gradient-to-t from-yellow-400 to-yellow-300 dark:from-yellow-600 dark:to-yellow-500" />
                  </motion.div>
                )}

                {/* 3rd place */}
                {topThree[2] && (
                  <motion.div
                    custom={2}
                    variants={podiumVariants}
                    className="flex flex-col items-center"
                  >
                    <div className="mb-2 text-amber-600">
                      <Medal className="h-7 w-7" />
                    </div>
                    <UserAvatar
                      name={topThree[2].name}
                      avatarUrl={topThree[2].avatarUrl}
                      size="md"
                    />
                    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {topThree[2].name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                      <Star className="h-3 w-3" />
                      {topThree[2].totalPoints}
                    </div>
                    <div className="mt-3 h-12 w-16 rounded-t-lg bg-gradient-to-t from-orange-400 to-orange-300 dark:from-orange-600 dark:to-orange-500" />
                  </motion.div>
                )}
              </div>
            )}

            {/* Full ranking list */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {memberStats.map((stat) => (
                  <motion.div
                    key={stat.id}
                    variants={itemVariants}
                    layout
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-4',
                      getRankBgColor(stat.rank)
                    )}
                  >
                    {/* Rank */}
                    <div className="flex h-10 w-10 items-center justify-center">
                      {getRankIcon(stat.rank)}
                    </div>

                    {/* User info */}
                    <UserAvatar name={stat.name} avatarUrl={stat.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-gray-900 dark:text-white">
                        {stat.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.choreCount} {stat.choreCount === 1 ? 'chore' : 'chores'} completed
                      </p>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-2">
                      <TrendingUp
                        className={cn(
                          'h-5 w-5',
                          stat.totalPoints > 0 ? 'text-green-500' : 'text-gray-400'
                        )}
                      />
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {stat.totalPoints}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">pts</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {memberStats.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Trophy className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  No points yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Complete some chores to start earning points!
                </p>
              </motion.div>
            )}

            {/* Motivational message */}
            {memberStats.length > 0 && totalStats.totalPoints > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🎉 Great job everyone! Keep up the good work!
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
