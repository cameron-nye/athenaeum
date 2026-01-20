'use client';

/**
 * Display Loading Skeleton Component
 * REQ-3-017: Shimmer skeleton that matches content layout
 */

export function LoadingSkeleton() {
  return (
    <div className="display-grid bg-background h-full w-full animate-pulse">
      {/* Header skeleton */}
      <div className="display-header flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <div className="display-skeleton h-24 w-64 rounded-lg" />
          <div className="display-skeleton h-8 w-32 rounded-lg" />
          <div className="display-skeleton h-10 w-48 rounded-lg" />
        </div>
        <div className="display-skeleton h-6 w-40 rounded-lg" />
      </div>

      {/* Main content skeleton */}
      <div className="display-main space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="display-skeleton h-24 w-full rounded-xl"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Sidebar skeleton */}
      <div className="display-sidebar space-y-6">
        <div className="display-skeleton h-8 w-32 rounded-lg" />

        {[...Array(3)].map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            <div className="display-skeleton h-6 w-20 rounded-lg" />
            {[...Array(2)].map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="display-skeleton h-16 w-full rounded-lg"
                style={{ animationDelay: `${(groupIndex * 2 + itemIndex) * 100}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
