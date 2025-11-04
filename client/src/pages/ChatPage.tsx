import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { Sidebar } from '@/components/sidebar';
import { EmptyState } from '@/components/chat';
import { ChatSkeleton, SidebarSkeleton } from '@/components/loading';

export default function ChatPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);

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

  // Sidebar content - conditionally show loading or actual sidebar
  const sidebarContent = isSidebarLoading ? (
    <SidebarSkeleton />
  ) : (
    <Sidebar
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onSettings={handleSettings}
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
    >
      {mainContent}
    </MainLayout>
  );
}
