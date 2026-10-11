import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'dark' | 'light';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

/**
 * Truehost-style modern animated skeleton loader
 * Features a subtle left-to-right shimmer animation, smooth and fast, without layout shifts.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'light',
  rounded = 'xl'
}) => {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full'
  }[rounded];

  const shimmerClass = variant === 'dark' ? 'skeleton-shimmer-dark' : 'skeleton-shimmer-light';

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden select-none pointer-events-none ${shimmerClass} ${roundedClass} ${className}`}
    />
  );
};

/**
 * Skeleton placeholder for user dashboard (light theme matching UGOPAWAVERIFY user portal)
 */
export const UserDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="light" className="h-6 w-48" />
            <Skeleton variant="light" className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="light" className="h-10 w-28" rounded="2xl" />
            <Skeleton variant="light" className="h-10 w-32" rounded="2xl" />
          </div>
        </div>
      </div>

      {/* 3 Metric Cards matching wallet & credit balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="light" className="h-4 w-24" />
              <Skeleton variant="light" className="w-9 h-9" rounded="2xl" />
            </div>
            <Skeleton variant="light" className="h-9 w-36" />
            <Skeleton variant="light" className="h-3 w-44" />
          </div>
        ))}
      </div>

      {/* Service Grid Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="light" className="h-6 w-44" />
          <Skeleton variant="light" className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-5 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="light" className="w-10 h-10 shrink-0" rounded="2xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="light" className="h-4 w-3/4" />
                  <Skeleton variant="light" className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton variant="light" className="h-3 w-full" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton variant="light" className="h-5 w-16" rounded="lg" />
                <Skeleton variant="light" className="h-8 w-20" rounded="xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Table Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <Skeleton variant="light" className="h-5 w-40" />
          <Skeleton variant="light" className="h-8 w-24" rounded="xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-none">
              <div className="flex items-center gap-3">
                <Skeleton variant="light" className="w-9 h-9" rounded="xl" />
                <div className="space-y-1">
                  <Skeleton variant="light" className="h-4 w-36" />
                  <Skeleton variant="light" className="h-3 w-24" />
                </div>
              </div>
              <Skeleton variant="light" className="h-4 w-20" />
              <Skeleton variant="light" className="h-6 w-24" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for admin dashboard & management views (dark theme)
 */
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton variant="dark" className="h-7 w-60" />
          <Skeleton variant="dark" className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="dark" className="h-9 w-28" rounded="xl" />
          <Skeleton variant="dark" className="h-9 w-32" rounded="xl" />
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-3xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton variant="dark" className="h-3.5 w-24" />
              <Skeleton variant="dark" className="w-8 h-8" rounded="xl" />
            </div>
            <Skeleton variant="dark" className="h-8 w-28" />
            <Skeleton variant="dark" className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Table Section Skeleton */}
      <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <Skeleton variant="dark" className="h-5 w-44" />
          <Skeleton variant="dark" className="h-8 w-48" rounded="xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#222] last:border-none">
              <div className="flex items-center gap-3">
                <Skeleton variant="dark" className="w-10 h-10" rounded="full" />
                <div className="space-y-1.5">
                  <Skeleton variant="dark" className="h-4 w-36" />
                  <Skeleton variant="dark" className="h-3 w-28" />
                </div>
              </div>
              <Skeleton variant="dark" className="h-5 w-20" rounded="lg" />
              <Skeleton variant="dark" className="h-5 w-24" rounded="full" />
              <div className="flex gap-2">
                <Skeleton variant="dark" className="h-8 w-16" rounded="lg" />
                <Skeleton variant="dark" className="h-8 w-20" rounded="lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Generic Table Skeleton with customizable row & column count
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  variant?: 'dark' | 'light';
}> = ({ rows = 5, columns = 4, variant = 'light' }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`flex items-center justify-between p-4 rounded-2xl border ${
            variant === 'dark' ? 'bg-[#141414] border-[#222]' : 'bg-white border-gray-100'
          }`}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              variant={variant}
              className={`h-4 ${c === 0 ? 'w-36' : c === columns - 1 ? 'w-20' : 'w-24'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
