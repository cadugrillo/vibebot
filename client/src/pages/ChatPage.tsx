import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Sidebar } from '@/components/sidebar';
import { EmptyState, MessageList, MessageInput } from '@/components/chat';
import type { MessageType } from '@/components/chat';
import { ChatSkeleton, SidebarSkeleton } from '@/components/loading';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { getWebSocketClient, type WebSocketClient, type ConnectionState } from '@/lib/websocket';

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

// Mock messages for testing (to be replaced with real data later)
const MOCK_MESSAGES: MessageType[] = [
  {
    id: '1',
    role: 'user',
    content: 'Can you explain how React hooks work?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    status: 'sent',
  },
  {
    id: '2',
    role: 'assistant',
    content: `React Hooks are functions that let you use state and other React features in functional components. Here are the most common hooks:

## useState
\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

The **useState** hook allows you to add state to functional components.

## useEffect
\`\`\`javascript
useEffect(() => {
  // Side effect code here
  return () => {
    // Cleanup code
  };
}, [dependencies]);
\`\`\`

This hook handles side effects like:
- Data fetching
- Subscriptions
- DOM manipulation

## Key Benefits
- ✅ Simpler code
- ✅ Better code reuse
- ✅ No more class components needed`,
    timestamp: new Date(Date.now() - 1000 * 60 * 4), // 4 minutes ago
    status: 'sent',
  },
  {
    id: '3',
    role: 'user',
    content: 'What about **custom hooks**?',
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    status: 'sent',
  },
  {
    id: '4',
    role: 'assistant',
    content: `Great question! **Custom hooks** let you extract component logic into reusable functions.

Here's an example:

\`\`\`typescript
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
\`\`\`

You can then use it in any component:
\`\`\`javascript
const { width, height } = useWindowSize();
\`\`\`

> **Note**: Custom hooks must start with "use" and can call other hooks inside them.`,
    timestamp: new Date(Date.now() - 1000 * 30), // 30 seconds ago
    status: 'sent',
  },
];

export default function ChatPage() {
  const [isLoading] = useState(false);
  const [isSidebarLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string>('1');
  const [messages, setMessages] = useState<MessageType[]>(MOCK_MESSAGES);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // Track if others are typing

  // WebSocket state
  const wsClient = useRef<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  // Log connection state for debugging (will be used in UI in VBT-225)
  useEffect(() => {
    console.log('[WebSocket] Connection state:', connectionState, '| Connected:', isConnected);
  }, [connectionState, isConnected]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('[WebSocket] Initializing connection...');

    // Get or create WebSocket client instance
    if (!wsClient.current) {
      wsClient.current = getWebSocketClient({
        url: import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws',
        autoConnect: false,
      });
    }

    const client = wsClient.current;

    // Setup connection event listeners
    const handleConnectionEstablished = () => {
      console.log('[WebSocket] Connection established');
      setConnectionState('connected');
      toast.info('Connecting to server...');
    };

    const handleConnectionAuthenticated = (data: { connectionId: string }) => {
      console.log('[WebSocket] Authenticated:', data.connectionId);
      setConnectionState('authenticated');
      setIsConnected(true);
      toast.success('Connected to server');
    };

    const handleConnectionDisconnected = (data: { code: number; reason: string }) => {
      console.log('[WebSocket] Disconnected:', data.code, data.reason);
      setConnectionState('disconnected');
      setIsConnected(false);
      toast.error('Disconnected from server');
    };

    const handleConnectionError = (data: { message: string; code?: string }) => {
      console.error('[WebSocket] Connection error:', data.message, data.code);
      setConnectionState('error');
      setIsConnected(false);
      toast.error(`Connection error: ${data.message}`);
    };

    const handleStateChange = (data: { previousState: ConnectionState; currentState: ConnectionState }) => {
      console.log('[WebSocket] State change:', data.previousState, '→', data.currentState);
      setConnectionState(data.currentState);
    };

    // Message event handlers
    const handleMessageAck = (data: { messageId: string; status: string; error?: string }) => {
      console.log('[Message] Ack received:', data.messageId, data.status);

      if (data.status === 'error') {
        // Handle error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, status: 'error' as const, error: data.error || 'Unknown error' }
              : msg
          )
        );
        setIsSending(false);
        toast.error(data.error || 'Failed to send message');
      } else if (data.status === 'delivered') {
        // Message successfully delivered
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, status: 'sent' as const } : msg
          )
        );
        setIsSending(false);
        toast.success('Message sent');
      }
    };

    const handleMessageReceive = (data: {
      messageId: string;
      conversationId: string;
      content: string;
      userId: string;
      timestamp: string;
    }) => {
      console.log('[Message] Received:', data.messageId, 'from user:', data.userId);

      // Only add message if it's for the current conversation
      if (data.conversationId === selectedConversationId) {
        // Check if message already exists (avoid duplicates)
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === data.messageId);
          if (exists) {
            console.log('[Message] Duplicate message, skipping:', data.messageId);
            return prev;
          }

          // Add new message
          return [
            ...prev,
            {
              id: data.messageId,
              role: 'user' as const,
              content: data.content,
              timestamp: new Date(data.timestamp),
              status: 'sent' as const,
            },
          ];
        });
      }
    };

    const handleMessageStream = (data: {
      messageId: string;
      conversationId: string;
      content: string;
      isComplete: boolean;
      timestamp: string;
    }) => {
      console.log('[Message] Stream chunk:', data.messageId, 'complete:', data.isComplete);

      // Only process if it's for the current conversation
      if (data.conversationId === selectedConversationId) {
        setMessages((prev) => {
          // Check if this message already exists
          const existingIndex = prev.findIndex((msg) => msg.id === data.messageId);

          if (existingIndex === -1) {
            // First stream chunk - create new AI message
            console.log('[Message] Creating new streaming message:', data.messageId);
            return [
              ...prev,
              {
                id: data.messageId,
                role: 'assistant' as const,
                content: data.content,
                timestamp: new Date(data.timestamp),
                status: data.isComplete ? 'sent' as const : 'streaming' as const,
              },
            ];
          } else {
            // Subsequent chunks - update existing message
            console.log('[Message] Updating streaming message:', data.messageId, 'length:', data.content.length);
            return prev.map((msg, index) =>
              index === existingIndex
                ? {
                    ...msg,
                    content: data.content, // Replace entire content (cumulative, not delta)
                    status: data.isComplete ? 'sent' as const : 'streaming' as const,
                  }
                : msg
            );
          }
        });

        // Show completion toast when streaming finishes
        if (data.isComplete) {
          console.log('[Message] Streaming complete:', data.messageId);
        }
      }
    };

    // Typing event handlers
    const handleTypingStart = (data: { userId: string; conversationId: string }) => {
      console.log('[Typing] User started typing:', data.userId, 'in conversation:', data.conversationId);

      // Only show typing indicator for current conversation
      if (data.conversationId === selectedConversationId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { userId: string; conversationId: string }) => {
      console.log('[Typing] User stopped typing:', data.userId, 'in conversation:', data.conversationId);

      // Hide typing indicator for current conversation
      if (data.conversationId === selectedConversationId) {
        setIsTyping(false);
      }
    };

    // Register event listeners
    client.on('connection:established', handleConnectionEstablished);
    client.on('connection:authenticated', handleConnectionAuthenticated);
    client.on('connection:disconnected', handleConnectionDisconnected);
    client.on('connection:error', handleConnectionError);
    client.on('state:change', handleStateChange);
    client.on('message:ack', handleMessageAck);
    client.on('message:receive', handleMessageReceive);
    client.on('message:stream', handleMessageStream);
    client.on('typing:start', handleTypingStart);
    client.on('typing:stop', handleTypingStop);

    // Connect to WebSocket server
    console.log('[WebSocket] Connecting to server...');
    client.connect();

    // Cleanup on unmount
    return () => {
      console.log('[WebSocket] Cleaning up connection...');

      // Remove event listeners
      client.off('connection:established', handleConnectionEstablished);
      client.off('connection:authenticated', handleConnectionAuthenticated);
      client.off('connection:disconnected', handleConnectionDisconnected);
      client.off('connection:error', handleConnectionError);
      client.off('state:change', handleStateChange);
      client.off('message:ack', handleMessageAck);
      client.off('message:receive', handleMessageReceive);
      client.off('message:stream', handleMessageStream);
      client.off('typing:start', handleTypingStart);
      client.off('typing:stop', handleTypingStop);

      // Disconnect WebSocket
      client.disconnect();
      wsClient.current = null;
    };
  }, []); // Empty dependency array - run once on mount

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

  const handleSendMessage = (content: string, files?: File[]) => {
    console.log('[Message] Sending:', content, files);

    // Check if WebSocket is connected
    if (!isConnected || !wsClient.current) {
      toast.error('Not connected to server. Please wait...');
      console.error('[Message] Cannot send - WebSocket not connected');
      return;
    }

    // Generate unique message ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Create user message with 'sending' status
    const userMessage: MessageType = {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message to UI
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    // Send via WebSocket
    try {
      wsClient.current.send('message:send', {
        messageId,
        conversationId: selectedConversationId,
        content,
        timestamp: new Date().toISOString(),
      });

      console.log('[Message] Sent via WebSocket:', messageId);
    } catch (error) {
      console.error('[Message] Failed to send:', error);

      // Update message status to error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: 'error' as const, error: 'Failed to send message' }
            : msg
        )
      );
      setIsSending(false);
      toast.error('Failed to send message');
    }
  };

  const handleTypingStart = () => {
    // Only send if WebSocket is connected
    if (!isConnected || !wsClient.current) {
      return;
    }

    try {
      wsClient.current.send('typing:start', {
        conversationId: selectedConversationId,
        timestamp: new Date().toISOString(),
      });
      console.log('[Typing] Sent typing:start event');
    } catch (error) {
      console.error('[Typing] Failed to send typing:start:', error);
    }
  };

  const handleTypingStop = () => {
    // Only send if WebSocket is connected
    if (!isConnected || !wsClient.current) {
      return;
    }

    try {
      wsClient.current.send('typing:stop', {
        conversationId: selectedConversationId,
        timestamp: new Date().toISOString(),
      });
      console.log('[Typing] Sent typing:stop event');
    } catch (error) {
      console.error('[Typing] Failed to send typing:stop:', error);
    }
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
  ) : selectedConversationId ? (
    <div className="flex flex-col h-full">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          isTyping={isTyping}
          onRetry={(id) => console.log('Retry message:', id)}
          onCopy={(content) => console.log('Copied:', content)}
        />
      </div>

      {/* Sticky input at bottom */}
      <div className="sticky bottom-0 w-full bg-background">
        <MessageInput
          onSend={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          loading={isSending}
          placeholder="Type a message..."
          showCharacterCount={true}
          allowFileUpload={false}
        />
      </div>
    </div>
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
    <>
      <Toaster />
      <MainLayout
        sidebar={sidebarContent}
        onProfile={handleProfile}
        onSettings={handleSettings}
        sidebarCollapsed={sidebarCollapsed}
        conversationTitle={conversationTitle}
        connectionState={connectionState}
        isConnected={isConnected}
      >
        {mainContent}
      </MainLayout>
    </>
  );
}
