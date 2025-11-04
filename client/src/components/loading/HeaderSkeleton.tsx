import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Right Section */}
      <Skeleton className="h-9 w-9 rounded-full" />
    </header>
  );
}
