import type { ReactNode } from 'react';

export interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  onSidebarToggle?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
}

export interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

export interface MobileSidebarProps {
  children?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
