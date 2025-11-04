import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  showAvatar?: boolean;
  className?: string;
}

export function TypingIndicator({ showAvatar = true, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex w-full gap-3 px-4 py-6 justify-start', className)}>
      {/* AI Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Typing Animation */}
      <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%]">
        <div className="rounded-2xl px-4 py-3 bg-muted text-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
          </div>
        </div>
        <div className="text-xs text-muted-foreground px-2">
          AI is thinking...
        </div>
      </div>
    </div>
  );
}
