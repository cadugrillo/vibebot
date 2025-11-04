import { PenSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarHeader } from './SidebarHeader';
import { ChatList } from './ChatList';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SidebarProps {
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  onSettings?: () => void;
}

export function Sidebar({
  onNewChat,
  onSelectConversation,
  onSettings
}: SidebarProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      {/* Header */}
      <SidebarHeader />

      {/* New Chat Button - Prominent */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 font-medium"
          size="lg"
        >
          <PenSquare className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <Separator />

      {/* Chat List - Scrollable */}
      <div className="flex-1 min-h-0">
        <ChatList onSelectConversation={onSelectConversation} />
      </div>

      <Separator />

      {/* Footer - Settings and Theme */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2"
            onClick={onSettings}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
