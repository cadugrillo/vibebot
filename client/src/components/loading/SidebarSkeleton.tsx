import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* New Chat Button Skeleton */}
      <div className="p-3">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      <Separator />

      {/* Chat List Skeleton */}
      <div className="flex-1 p-2 space-y-1">
        {/* Section Title */}
        <div className="px-2 py-1">
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Chat Items */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-3 py-2.5 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}

        {/* Another Section */}
        <div className="px-2 py-1 mt-4">
          <Skeleton className="h-3 w-20" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="px-3 py-2.5 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>

      <Separator />

      {/* Footer Skeleton */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}
