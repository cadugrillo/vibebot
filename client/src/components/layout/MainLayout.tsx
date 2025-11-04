import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Header } from '@/components/header';
import type { MainLayoutProps } from './types';

export function MainLayout({
  children,
  sidebar,
  showSidebar = true,
  onProfile,
  onSettings,
  sidebarCollapsed = false,
}: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar - Claude-like styling with collapse support */}
      {showSidebar && isDesktop && (
        <aside
          className={`hidden lg:flex lg:flex-col border-r border-border transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {sidebar}
        </aside>
      )}

      {/* Mobile Sidebar Drawer - Claude-like */}
      {showSidebar && !isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 !bg-background">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Access your conversations and settings
            </SheetDescription>
            <div
              className="h-full"
              style={{ backgroundColor: 'hsl(var(--background))' }}
            >
              {sidebar}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header - Always visible */}
        <Header
          onMenuClick={() => setMobileOpen(true)}
          onProfile={onProfile}
          onSettings={onSettings}
          showMenuButton={showSidebar}
        />

        {/* Main Content - Claude-like centered layout */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
