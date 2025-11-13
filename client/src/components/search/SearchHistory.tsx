/**
 * SearchHistory Component
 * VBT-249: Search History Management
 *
 * Displays recent search queries with ability to re-execute or remove them
 */

import { formatDistanceToNow } from 'date-fns';
import { Clock, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SearchHistoryItem } from './types';

interface SearchHistoryProps {
  /**
   * Array of search history items
   */
  history: SearchHistoryItem[];

  /**
   * Callback when a history item is clicked
   */
  onSelectHistory: (query: string) => void;

  /**
   * Callback to remove a specific history item
   */
  onRemoveItem: (index: number) => void;

  /**
   * Callback to clear all history
   */
  onClearAll: () => void;

  /**
   * Optional class name
   */
  className?: string;
}

/**
 * SearchHistory Component
 */
export function SearchHistory({
  history,
  onSelectHistory,
  onRemoveItem,
  onClearAll,
  className,
}: SearchHistoryProps) {
  // Empty state
  if (history.length === 0) {
    return (
      <div
        className={cn(
          'p-8 text-center text-sm text-muted-foreground',
          className
        )}
      >
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent searches</p>
        <p className="text-xs mt-1">Your search history will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Recent Searches</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1 max-h-[300px]">
        <div className="p-2 space-y-1">
          {history.map((item, index) => (
            <div
              key={`${item.query}-${item.timestamp.getTime()}`}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-md',
                'hover:bg-accent transition-colors cursor-pointer'
              )}
              onClick={() => onSelectHistory(item.query)}
            >
              {/* Query and metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {item.query}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.resultCount} {item.resultCount === 1 ? 'result' : 'results'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </div>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-destructive/10 hover:text-destructive'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
