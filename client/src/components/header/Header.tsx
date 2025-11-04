import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onMenuClick?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  showMenuButton?: boolean;
  conversationTitle?: string;
}

export function Header({
  onMenuClick,
  onProfile,
  onSettings,
  showMenuButton = false,
  conversationTitle,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-background">
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
          <h1 className="text-base font-semibold">{conversationTitle}</h1>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <UserMenu onProfile={onProfile} onSettings={onSettings} />
      </div>
    </header>
  );
}
