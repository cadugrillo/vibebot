import { useState } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow, format } from 'date-fns';
import { Copy, Check, Bot, User, AlertCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CodeBlock } from './CodeBlock';
import type { MessageProps } from './types';

export function Message({
  message,
  onRetry,
  onCopy,
  showAvatar = true,
  isStreaming = false,
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';
  const isStreamingStatus = message.status === 'streaming' || isStreaming;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleRetry = () => {
    onRetry?.(message.id);
  };

  return (
    <div
      className={cn(
        'group flex w-full gap-3 px-4 py-6',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* AI Avatar - Left side */}
      {!isUser && showAvatar && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[85%] md:max-w-[75%]',
          isUser && 'items-end'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 break-words transition-opacity',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            isError && 'border-2 border-destructive',
            isSending && 'opacity-70',
            isStreamingStatus && 'opacity-90'
          )}
        >
          {/* Message Text with Markdown */}
          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom components for better styling
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  return !inline && match ? (
                    <CodeBlock language={className}>
                      {codeString}
                    </CodeBlock>
                  ) : (
                    <code
                      className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-muted font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Streaming Indicator */}
          {isStreaming && !isUser && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* Copy Button - appears on hover (desktop) or always visible (mobile) */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              'h-7 px-2 opacity-0 lg:group-hover:opacity-100 md:opacity-100 transition-opacity',
              copied && 'opacity-100'
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>

        {/* Error Message with Retry */}
        {isError && message.error && (
          <div className="flex items-start gap-2 px-2 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-destructive font-medium">
                {message.error}
              </p>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-7 px-2 text-xs border-destructive/30 hover:bg-destructive/20"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Status and Timestamp */}
        <div className="flex items-center gap-2 px-2">
          {/* Status indicator */}
          {isSending && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Sending...</span>
            </div>
          )}
          {isStreamingStatus && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>AI is typing...</span>
            </div>
          )}
          {!isSending && !isStreamingStatus && (
            <div
              className="text-xs text-muted-foreground"
              title={format(message.timestamp, 'PPpp')} // Full date and time on hover
            >
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar - Right side */}
      {isUser && showAvatar && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
