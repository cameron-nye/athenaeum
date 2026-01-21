'use client';

/**
 * Chore card component with completion toggle and touch-friendly design.
 * Features Framer Motion animations for smooth list interactions.
 * Designed for the Skylight-style display interface.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FamilyAvatar } from '@/components/family/FamilyAvatar';
import { Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Chore } from '@/lib/types/chore';
import { formatDueDate, isChoreOverdue } from '@/lib/types/chore';

export interface ChoreCardProps {
  /** Chore data to display */
  chore: Chore;
  /** Callback when completion is toggled */
  onComplete: (id: string) => void;
  /** Whether the card is in a loading/updating state */
  isUpdating?: boolean;
}

export function ChoreCard({ chore, onComplete, isUpdating = false }: ChoreCardProps) {
  const isOverdue = isChoreOverdue(chore.dueDate, chore.completed);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
    >
      <Card
        className={cn(
          'transition-all duration-200 hover:shadow-md',
          chore.completed && 'opacity-60',
          isOverdue && 'border-destructive/50'
        )}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <FamilyAvatar member={chore.assignee} size="lg" />

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'truncate font-medium',
                chore.completed && 'text-muted-foreground line-through'
              )}
            >
              {chore.title}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <Clock className="text-muted-foreground h-3 w-3" />
              <span
                className={cn('text-muted-foreground text-sm', isOverdue && 'text-destructive')}
              >
                {formatDueDate(chore.dueDate)}
              </span>
              {chore.recurring && (
                <Badge variant="secondary" className="text-xs">
                  {chore.recurring}
                </Badge>
              )}
            </div>
          </div>

          <Button
            size="touch"
            variant={chore.completed ? 'secondary' : 'default'}
            onClick={() => onComplete(chore.id)}
            disabled={isUpdating}
            aria-label={chore.completed ? 'Mark as incomplete' : 'Mark as complete'}
            className="shrink-0"
          >
            <Check className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ChoreCard;
