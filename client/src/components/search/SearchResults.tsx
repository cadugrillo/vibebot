/**
 * SearchResults Component
 * VBT-242: Search UI Components Structure
 *
 * Displays search results with highlighting and metadata
 */

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SearchResultsProps, SearchMatch } from './types';

/**
 * Renders text with highlighted portions
 */
function HighlightedText({ text, highlights }: { text: string; highlights: SearchMatch['highlights'] }) {
  if (!highlights || highlights.length === 0) {
    return <span>{text}</span>;
  }

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight, idx) => {
    // Add text before highlight
    if (highlight.start > lastIndex) {
      segments.push(
        <span key={`text-${idx}`}>{text.slice(lastIndex, highlight.start)}</span>
      );
    }

    // Add highlighted text
    segments.push(
      <mark
        key={`highlight-${idx}`}
        className="bg-yellow-200 dark:bg-yellow-900 text-foreground font-medium px-0.5 rounded"
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>
    );

    lastIndex = highlight.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return <span>{segments}</span>;
}

/**
 * Individual search result item
 */
function SearchResultItem({
  result,
  onSelect,
}: {
  result: SearchMatch;
  onSelect: (conversationId: string, messageId?: string) => void;
}) {
  const handleClick = () => {
    onSelect(result.conversationId, result.messageId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 rounded-lg',
        'hover:bg-accent hover:text-accent-foreground',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'group'
      )}
    >
      {/* Title and Badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium line-clamp-1 flex-1">
          {result.conversationTitle}
        </h4>
        <Badge
          variant={result.matchType === 'title' ? 'default' : 'secondary'}
          className="text-xs flex-shrink-0"
        >
          {result.matchType === 'title' ? (
            <>
              <FileText className="h-3 w-3 mr-1" />
              Title
            </>
          ) : (
            <>
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </>
          )}
        </Badge>
      </div>

      {/* Snippet with highlighting */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        <HighlightedText text={result.snippet} highlights={result.highlights} />
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
        </span>
        {result.model && (
          <>
            <span>•</span>
            <span className="capitalize">
              {result.model.replace('claude-', '').replace('-', ' ')}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

/**
 * Loading skeleton for search results
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state for no results
 */
function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">No results found</p>
      <p className="text-xs text-muted-foreground">
        Try different keywords or adjust your filters
      </p>
      {query && (
        <p className="text-xs text-muted-foreground mt-2">
          Searched for: <span className="font-medium">"{query}"</span>
        </p>
      )}
    </div>
  );
}

/**
 * SearchResults Component
 */
export function SearchResults({
  results,
  isLoading = false,
  query,
  onSelectResult,
}: SearchResultsProps) {
  // Loading state
  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  // Empty state
  if (!results || results.length === 0) {
    return <EmptyResults query={query} />;
  }

  // Results list
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {/* Results count */}
        <div className="px-2 py-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {results.length} {results.length === 1 ? 'Result' : 'Results'}
          </p>
        </div>

        {/* Results */}
        {results.map((result) => (
          <SearchResultItem
            key={`${result.conversationId}-${result.messageId || 'title'}`}
            result={result}
            onSelect={onSelectResult}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
