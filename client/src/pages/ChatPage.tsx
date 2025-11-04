import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Sidebar } from '@/components/sidebar';
import { EmptyState } from '@/components/chat';
import { ChatSkeleton, SidebarSkeleton } from '@/components/loading';

const SIDEBAR_COLLAPSED_KEY = 'vibebot-sidebar-collapsed';

export default function ChatPage() {
  const [isLoading] = useState(false);
  const [isSidebarLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev: boolean) => !prev);
  };

  // Handlers
  const handleNewChat = () => {
    console.log('New chat clicked');
    // TODO: Implement new chat functionality
    // This will create a new conversation and navigate to it
  };

  const handleSelectConversation = (id: string) => {
    console.log('Selected conversation:', id);
    // TODO: Implement conversation selection
    // This will navigate to the selected conversation
    // navigate(`/chat/${id}`);
  };

  const handleProfile = () => {
    console.log('Profile clicked');
    // TODO: Implement profile page/modal
    // navigate('/profile');
  };

  const handleSettings = () => {
    console.log('Settings clicked');
    // TODO: Implement settings modal
    // This could open a modal or navigate to settings page
  };

  const handleRenameConversation = (id: string) => {
    console.log('Rename conversation:', id);
    // TODO: Implement rename conversation modal
  };

  const handleDeleteConversation = (id: string) => {
    console.log('Delete conversation:', id);
    // TODO: Implement delete conversation confirmation
  };

  const handleExportConversation = (id: string) => {
    console.log('Export conversation:', id);
    // TODO: Implement export conversation functionality
  };

  // Sidebar content - conditionally show loading or actual sidebar
  const sidebarContent = isSidebarLoading ? (
    <SidebarSkeleton />
  ) : (
    <Sidebar
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onSettings={handleSettings}
      collapsed={sidebarCollapsed}
      onToggleCollapse={toggleSidebarCollapsed}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
      onExportConversation={handleExportConversation}
    />
  );

  // Main content - conditionally show loading, empty state, or chat
  const mainContent = isLoading ? (
    <ChatSkeleton />
  ) : (
    <EmptyState
      title="Welcome to VibeBot"
      description="Start a conversation and experience AI-powered assistance. Ask me anything, and I'll do my best to help you."
      icon="sparkles"
      ctaText="Start New Chat"
      onCtaClick={handleNewChat}
    />
  );

  return (
    <MainLayout
      sidebar={sidebarContent}
      onProfile={handleProfile}
      onSettings={handleSettings}
      sidebarCollapsed={sidebarCollapsed}
    >
      {mainContent}
    </MainLayout>
  );
}
