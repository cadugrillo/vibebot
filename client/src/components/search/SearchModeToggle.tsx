/**
 * SearchModeToggle Component
 * VBT-248: Conversation-Specific Search Mode
 *
 * Toggle between "All Conversations" and "Current Conversation" search modes
 */

import { Globe, MessageSquare } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { SearchMode } from './types';

interface SearchModeToggleProps {
  /**
   * Current search mode
   */
  mode: SearchMode;

  /**
   * Callback when mode changes
   */
  onModeChange: (mode: SearchMode) => void;

  /**
   * Conversation title (shown when in conversation mode)
   */
  conversationTitle?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * SearchModeToggle Component
 */
export function SearchModeToggle({
  mode,
  onModeChange,
  conversationTitle,
  disabled = false,
  size = 'default',
}: SearchModeToggleProps) {
  return (
    <div className="space-y-2">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value) onModeChange(value as SearchMode);
        }}
        disabled={disabled}
        className={cn(
          'justify-start',
          size === 'sm' && 'h-8',
          size === 'lg' && 'h-12'
        )}
      >
        <ToggleGroupItem
          value="all"
          aria-label="Search all conversations"
          className={cn(
            'gap-2',
            size === 'sm' && 'text-xs px-2',
            size === 'lg' && 'text-base px-4'
          )}
        >
          <Globe className={cn('h-4 w-4', size === 'lg' && 'h-5 w-5')} />
          <span>All Conversations</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="conversation"
          aria-label="Search current conversation"
          className={cn(
            'gap-2',
            size === 'sm' && 'text-xs px-2',
            size === 'lg' && 'text-base px-4'
          )}
        >
          <MessageSquare className={cn('h-4 w-4', size === 'lg' && 'h-5 w-5')} />
          <span>Current Conversation</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Conversation context - shown when in conversation mode */}
      {mode === 'conversation' && conversationTitle && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Searching in:</span>
          <span className="font-medium truncate">{conversationTitle}</span>
        </div>
      )}
    </div>
  );
}
