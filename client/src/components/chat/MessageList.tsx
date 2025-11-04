import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { MessageSkeleton } from './MessageSkeleton';
import { cn } from '@/lib/utils';
import type { Message as MessageType } from './types';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  isTyping?: boolean;
  onRetry?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  className?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  isTyping = false,
  onRetry,
  onCopy,
  className,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom('smooth');
    }
  }, [messages, isTyping, shouldAutoScroll]);

  // Handle scroll events to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      setShowScrollButton(!isNearBottom);
      setShouldAutoScroll(isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Group consecutive messages from the same sender
  const groupMessages = (msgs: MessageType[]) => {
    const groups: { messages: MessageType[]; showAvatar: boolean }[] = [];

    msgs.forEach((msg, index) => {
      const prevMsg = msgs[index - 1];
      const isSameSender = prevMsg && prevMsg.role === msg.role;

      if (isSameSender) {
        groups[groups.length - 1].messages.push(msg);
      } else {
        groups.push({ messages: [msg], showAvatar: true });
      }
    });

    return groups;
  };

  const messageGroups = groupMessages(messages);

  return (
    <div className="relative h-full">
      {/* Messages Container */}
      <div
        ref={containerRef}
        className={cn('h-full overflow-y-auto scroll-smooth', className)}
      >
        <div className="max-w-4xl mx-auto">
          {/* Loading Skeletons */}
          {isLoading && (
            <>
              <MessageSkeleton isUser={false} />
              <MessageSkeleton isUser={true} />
              <MessageSkeleton isUser={false} />
            </>
          )}

          {/* Messages */}
          {!isLoading && messageGroups.map((group, _groupIndex) =>
            group.messages.map((message, msgIndex) => (
              <Message
                key={message.id}
                message={message}
                showAvatar={msgIndex === group.messages.length - 1}
                onRetry={onRetry}
                onCopy={onCopy}
              />
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              scrollToBottom('smooth');
              setShouldAutoScroll(true);
            }}
            className="h-10 w-10 rounded-full shadow-lg"
          >
            <ArrowDown className="h-5 w-5" />
            <span className="sr-only">Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  );
}
