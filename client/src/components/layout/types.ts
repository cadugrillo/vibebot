import type { ReactNode } from 'react';
import type { ConnectionState } from '@/lib/websocket';

export interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  showSidebar?: boolean;
  onSidebarToggle?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  sidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  conversationTitle?: string;
  connectionState?: ConnectionState;
  isConnected?: boolean;
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
