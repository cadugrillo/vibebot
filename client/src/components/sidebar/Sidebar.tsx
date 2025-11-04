import { PenSquare, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarHeader } from './SidebarHeader';
import { ChatList } from './ChatList';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsDesktop } from '@/hooks/useMediaQuery';

interface SidebarProps {
  onNewChat?: () => void;
  onSelectConversation?: (id: string) => void;
  onSettings?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRenameConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onExportConversation?: (id: string) => void;
}

export function Sidebar({
  onNewChat,
  onSelectConversation,
  onSettings,
  collapsed = false,
  onToggleCollapse,
  onRenameConversation,
  onDeleteConversation,
  onExportConversation,
}: SidebarProps) {
  const isDesktop = useIsDesktop();

  if (collapsed && isDesktop) {
    return (
      <TooltipProvider>
        <div
          className="flex flex-col h-full items-center"
          style={{ backgroundColor: 'hsl(var(--background))' }}
        >
          {/* Toggle Button */}
          <div className="p-2 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="w-full h-10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator />

          {/* New Chat Button - Icon Only */}
          <div className="p-2 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNewChat}
                  size="icon"
                  className="w-full h-10"
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          <Separator />

          {/* Settings and Theme - Icon Only */}
          <div className="p-2 space-y-2 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettings}
                  className="w-full h-10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-full"
        style={{ backgroundColor: 'hsl(var(--background))' }}
      >
        {/* Header with Toggle Button (desktop only) - matches main header height */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border">
          <SidebarHeader />
          {isDesktop && onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Collapse sidebar</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

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

        {/* Chat List - Scrollable */}
        <div className="flex-1 min-h-0">
          <ChatList
            onSelectConversation={onSelectConversation}
            onRenameConversation={onRenameConversation}
            onDeleteConversation={onDeleteConversation}
            onExportConversation={onExportConversation}
          />
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
    </TooltipProvider>
  );
}
