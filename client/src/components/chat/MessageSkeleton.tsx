import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageSkeletonProps {
  isUser?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function MessageSkeleton({
  isUser = false,
  showAvatar = true,
  className
}: MessageSkeletonProps) {
  return (
    <div
      className={cn(
        'flex w-full gap-3 px-4 py-6',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      {/* Avatar skeleton - Left side for AI */}
      {!isUser && showAvatar && (
        <div className="flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}

      {/* Message Content skeleton */}
      <div className={cn('flex flex-col gap-2 max-w-[85%] md:max-w-[75%]', isUser && 'items-end')}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[180px]" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Avatar skeleton - Right side for user */}
      {isUser && showAvatar && (
        <div className="flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
    </div>
  );
}
