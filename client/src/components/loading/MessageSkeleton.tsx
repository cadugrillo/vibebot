import { Skeleton } from '@/components/ui/skeleton';

interface MessageSkeletonProps {
  variant?: 'user' | 'assistant';
  lines?: number;
}

export function MessageSkeleton({ variant = 'assistant', lines = 3 }: MessageSkeletonProps) {
  const isUser = variant === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="flex gap-3 max-w-[80%]">
        {/* Avatar - only for assistant */}
        {!isUser && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}

        {/* Message Content */}
        <div className="flex-1 space-y-2">
          {/* Lines */}
          {[...Array(lines)].map((_, i) => {
            // Make last line shorter
            const isLastLine = i === lines - 1;
            const width = isLastLine ? 'w-3/4' : 'w-full';

            return <Skeleton key={i} className={`h-4 ${width}`} />;
          })}
        </div>
      </div>
    </div>
  );
}

// Typing indicator skeleton (animated)
export function TypingIndicatorSkeleton() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex gap-3 max-w-[80%]">
        {/* Avatar */}
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

        {/* Typing dots */}
        <div className="flex items-center gap-1 px-4 py-3 bg-muted rounded-lg">
          <div className="flex gap-1">
            <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
