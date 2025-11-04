import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatListItem {
  id: string;
  title: string;
  preview?: string;
  timestamp?: string;
  isActive?: boolean;
}

interface ChatListProps {
  conversations?: ChatListItem[];
  onSelectConversation?: (id: string) => void;
}

// Placeholder data for testing
const PLACEHOLDER_CONVERSATIONS: ChatListItem[] = [
  {
    id: '1',
    title: 'Getting started with VibeBot',
    preview: 'How do I create a new conversation?',
    timestamp: '2h ago',
    isActive: true,
  },
  {
    id: '2',
    title: 'React best practices',
    preview: 'What are the best practices for...',
    timestamp: '1d ago',
  },
  {
    id: '3',
    title: 'TypeScript tips',
    preview: 'Can you explain TypeScript generics?',
    timestamp: '2d ago',
  },
];

export function ChatList({
  conversations = PLACEHOLDER_CONVERSATIONS,
  onSelectConversation
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
          <button
            key={conversation.id}
            onClick={() => onSelectConversation?.(conversation.id)}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              conversation.isActive && 'bg-accent'
            )}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium line-clamp-1">
                {conversation.title}
              </span>
              {conversation.preview && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {conversation.preview}
                </span>
              )}
            </div>
          </button>
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
