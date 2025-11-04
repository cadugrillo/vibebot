import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';
import { ConnectionStatus, ConnectionStatusCompact } from '@/components/chat';
import type { ConnectionState } from '@/lib/websocket';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  showMenuButton?: boolean;
  conversationTitle?: string;
  connectionState?: ConnectionState;
  isConnected?: boolean;
}

export function Header({
  onMenuClick,
  onProfile,
  onSettings,
  showMenuButton = false,
  conversationTitle,
  connectionState,
  isConnected = false,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-background border-b border-border">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}
        {conversationTitle && (
          <div className="hidden lg:flex items-center gap-2">
            <h1 className="text-lg font-semibold">{conversationTitle}</h1>
          </div>
        )}
      </div>

      {/* Center Section - Mobile Only */}
      {conversationTitle && (
        <div className="lg:hidden absolute left-1/2 transform -translate-x-1/2">
          <h1 className="text-base font-semibold truncate max-w-[180px]">{conversationTitle}</h1>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Connection Status - Show full on desktop, compact on mobile */}
        {connectionState && (
          <>
            <div className="hidden md:block">
              <ConnectionStatus
                state={connectionState}
                isConnected={isConnected}
              />
            </div>
            <div className="md:hidden">
              <ConnectionStatusCompact
                state={connectionState}
                isConnected={isConnected}
              />
            </div>
          </>
        )}
        <UserMenu onProfile={onProfile} onSettings={onSettings} />
      </div>
    </header>
  );
}
