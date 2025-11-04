import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Sidebar } from '@/components/sidebar';
import { EmptyState } from '@/components/chat';
import { ChatSkeleton, SidebarSkeleton } from '@/components/loading';

const SIDEBAR_COLLAPSED_KEY = 'vibebot-sidebar-collapsed';

// Placeholder conversations (to be replaced with real data later)
const PLACEHOLDER_CONVERSATIONS = [
  { id: '1', title: 'Getting started with VibeBot features', isActive: true },
  { id: '2', title: 'React best practices and patterns' },
  { id: '3', title: 'TypeScript advanced tips and tricks' },
  { id: '4', title: 'Building a scalable REST API service' },
  { id: '5', title: 'Understanding async/await in JavaScript' },
  { id: '6', title: 'Database design principles and normalization' },
  { id: '7', title: 'Modern CSS techniques and Tailwind usage' },
  { id: '8', title: 'Authentication and authorization strategies' },
  { id: '9', title: 'WebSocket implementation for real-time chat' },
  { id: '10', title: 'Testing strategies with Jest and React Testing' },
];

export default function ChatPage() {
  const [isLoading] = useState(false);
  const [isSidebarLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string>('1');

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
    setSelectedConversationId(id);
    // TODO: Implement conversation navigation
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

  // Get selected conversation title
  const selectedConversation = PLACEHOLDER_CONVERSATIONS.find(
    (conv) => conv.id === selectedConversationId
  );
  const conversationTitle = selectedConversation?.title;

  // Update conversations with active state
  const conversationsWithActive = PLACEHOLDER_CONVERSATIONS.map((conv) => ({
    ...conv,
    isActive: conv.id === selectedConversationId,
  }));

  // Sidebar content - conditionally show loading or actual sidebar
  const sidebarContent = isSidebarLoading ? (
    <SidebarSkeleton />
  ) : (
    <Sidebar
      conversations={conversationsWithActive}
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
      conversationTitle={conversationTitle}
    >
      {mainContent}
    </MainLayout>
  );
}
