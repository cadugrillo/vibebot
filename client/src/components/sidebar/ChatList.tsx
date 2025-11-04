import { MessageSquare, MoreHorizontal, Edit2, Trash2, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatListItem {
  id: string;
  title: string;
  isActive?: boolean;
}

interface ChatListProps {
  conversations?: ChatListItem[];
  onSelectConversation?: (id: string) => void;
  onRenameConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onExportConversation?: (id: string) => void;
}

// Placeholder data for testing
const PLACEHOLDER_CONVERSATIONS: ChatListItem[] = [
  {
    id: '1',
    title: 'Getting started with VibeBot features',
    isActive: true,
  },
  {
    id: '2',
    title: 'React best practices and patterns',
  },
  {
    id: '3',
    title: 'TypeScript advanced tips and tricks',
  },
  {
    id: '4',
    title: 'Building a scalable REST API service',
  },
  {
    id: '5',
    title: 'Understanding async/await in JavaScript',
  },
  {
    id: '6',
    title: 'Database design principles and normalization',
  },
  {
    id: '7',
    title: 'Modern CSS techniques and Tailwind usage',
  },
  {
    id: '8',
    title: 'Authentication and authorization strategies',
  },
  {
    id: '9',
    title: 'WebSocket implementation for real-time chat',
  },
  {
    id: '10',
    title: 'Testing strategies with Jest and React Testing',
  },
];

// Truncate title to a specific number of characters
const truncateTitle = (title: string, maxLength: number = 22): string => {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + '...';
};

export function ChatList({
  conversations = PLACEHOLDER_CONVERSATIONS,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onExportConversation,
}: ChatListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a new chat to get started
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {/* Today Section */}
        <div className="px-2 py-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Today
          </h3>
        </div>
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              'group relative px-3 py-2 rounded-lg transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              conversation.isActive && 'bg-accent'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onSelectConversation?.(conversation.id)}
                className="flex-1 text-left focus-visible:outline-none min-w-0"
              >
                <span className="text-sm font-medium block">
                  {truncateTitle(conversation.title)}
                </span>
              </button>

              {/* Actions Menu - appears on hover */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameConversation?.(conversation.id);
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportConversation?.(conversation.id);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation?.(conversation.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {/* Previous 7 Days Section (Optional) */}
        <div className="px-2 py-1 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Previous 7 Days
          </h3>
        </div>
        <div className="px-3 py-2.5 text-xs text-muted-foreground">
          No conversations
        </div>
      </div>
    </ScrollArea>
  );
}
