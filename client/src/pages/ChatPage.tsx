import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout';
import { Sidebar } from '@/components/sidebar';
import { EmptyState, MessageList, MessageInput } from '@/components/chat';
import type { MessageType } from '@/components/chat';
import { ChatSkeleton, SidebarSkeleton } from '@/components/loading';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { getWebSocketClient, type WebSocketClient, type ConnectionState } from '@/lib/websocket';
import {
  listConversations,
  createConversation,
  deleteConversation as deleteConversationAPI,
  updateConversation,
  type Conversation,
} from '@/lib/api/conversations';
import {
  listMessages,
  createMessage as createMessageAPI,
  type Message as APIMessage,
} from '@/lib/api/messages';

const SIDEBAR_COLLAPSED_KEY = 'vibebot-sidebar-collapsed';

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Conversation and message state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // Track if others are typing

  // WebSocket state
  const wsClient = useRef<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  // Use ref to track selectedConversationId so WebSocket handlers can access current value
  // (avoids stale closure issue since WebSocket effect only runs once)
  const selectedConversationIdRef = useRef<string | null>(null);

  // Log connection state for debugging (will be used in UI in VBT-225)
  useEffect(() => {
    console.log('[WebSocket] Connection state:', connectionState, '| Connected:', isConnected);
  }, [connectionState, isConnected]);

  // Keep ref in sync with selectedConversationId state
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
    console.log('[ChatPage] Selected conversation updated:', selectedConversationId);
  }, [selectedConversationId]);

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

      // Don't mark messages as error - WebSocket client will queue them
      // Messages will remain in 'sending' state until reconnection or actual failure
      setIsSending(false);

      toast.error('Disconnected from server. Messages will be sent when reconnected.');
    };

    const handleConnectionError = (data: { message: string; code?: string }) => {
      console.error('[WebSocket] Connection error:', data.message, data.code);
      setConnectionState('error');
      setIsConnected(false);

      // Don't mark messages as error - WebSocket client will queue them
      // Messages will remain in 'sending' state until reconnection or actual failure
      setIsSending(false);

      toast.error(`Connection error: ${data.message}. Retrying...`);
    };

    const handleStateChange = (data: { previousState: ConnectionState; currentState: ConnectionState }) => {
      console.log('[WebSocket] State change:', data.previousState, '→', data.currentState);
      setConnectionState(data.currentState);
    };

    // Reconnection event handlers
    const handleReconnectSuccess = (data: { attemptNumber: number }) => {
      console.log('[WebSocket] Reconnected successfully after', data.attemptNumber, 'attempts');

      // Get queue size to inform user
      const queueSize = wsClient.current?.getMessageQueue().size() || 0;

      if (queueSize > 0) {
        toast.success(`Reconnected! Sending ${queueSize} queued message${queueSize > 1 ? 's' : ''}...`);
      } else {
        toast.success('Reconnected to server');
      }
    };

    const handleReconnectFailed = () => {
      console.error('[WebSocket] Reconnection failed - max retries reached');

      // Mark all sending messages as error since reconnection failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.status === 'sending'
            ? {
                ...msg,
                status: 'error' as const,
                error: 'Failed to reconnect. Click retry to try again.',
              }
            : msg
        )
      );

      toast.error('Could not reconnect to server. Please refresh the page.');
    };

    // Message event handlers
    const handleMessageAck = (data: { messageId: string; status: string; error?: string }) => {
      console.log('[Message] Ack received:', data.messageId, data.status);

      if (data.status === 'error') {
        // Parse error message for specific cases
        let errorMessage = data.error || 'Unknown error';
        let userMessage = errorMessage;

        // Rate limit error
        if (errorMessage.toLowerCase().includes('rate limit')) {
          userMessage = 'Too many messages. Please wait a moment and try again.';
        }
        // Authentication error
        else if (errorMessage.toLowerCase().includes('auth')) {
          userMessage = 'Authentication failed. Please refresh and try again.';
        }
        // Validation error
        else if (errorMessage.toLowerCase().includes('validation')) {
          userMessage = 'Message format invalid. Please try again.';
        }
        // Network/connection error
        else if (errorMessage.toLowerCase().includes('connection') || errorMessage.toLowerCase().includes('network')) {
          userMessage = 'Connection error. Please check your internet and try again.';
        }

        // Handle error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, status: 'error' as const, error: userMessage }
              : msg
          )
        );
        setIsSending(false);
        toast.error(userMessage);
      } else if (data.status === 'delivered') {
        // Message successfully delivered
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, status: 'sent' as const } : msg
          )
        );
        setIsSending(false);
        // Don't show success toast for every message - it's too noisy
        // toast.success('Message sent');
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

      // Only add message if it's for the current conversation (use ref for current value)
      if (data.conversationId === selectedConversationIdRef.current) {
        // Safety check: ensure content is defined
        const content = data.content ?? '';

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
              content: content,
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
      console.log('[Message] Stream chunk:', data.messageId, 'complete:', data.isComplete, 'content length:', data.content?.length || 0);

      // Only process if it's for the current conversation (use ref for current value)
      if (data.conversationId === selectedConversationIdRef.current) {
        // Safety check: ensure content is defined (use empty string if undefined)
        const content = data.content ?? '';

        setMessages((prev) => {
          // Check if this message already exists
          const existingIndex = prev.findIndex((msg) => msg.id === data.messageId);

          if (existingIndex === -1) {
            // First stream chunk - only create message if we have content
            // Skip empty initial chunks to avoid showing empty bubbles
            if (content.length === 0 && !data.isComplete) {
              console.log('[Message] Skipping empty initial chunk:', data.messageId);
              return prev; // Don't create message yet
            }

            // Create new AI message
            console.log('[Message] Creating new streaming message:', data.messageId);
            return [
              ...prev,
              {
                id: data.messageId,
                role: 'assistant' as const,
                content: content,
                timestamp: new Date(data.timestamp),
                status: data.isComplete ? 'sent' as const : 'streaming' as const,
              },
            ];
          } else {
            // Subsequent chunks - update existing message
            console.log('[Message] Updating streaming message:', data.messageId, 'length:', content.length);
            return prev.map((msg, index) =>
              index === existingIndex
                ? {
                    ...msg,
                    content: content, // Replace entire content (cumulative, not delta)
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

      // Only show typing indicator for current conversation (use ref for current value)
      if (data.conversationId === selectedConversationIdRef.current) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { userId: string; conversationId: string }) => {
      console.log('[Typing] User stopped typing:', data.userId, 'in conversation:', data.conversationId);

      // Hide typing indicator for current conversation (use ref for current value)
      if (data.conversationId === selectedConversationIdRef.current) {
        setIsTyping(false);
      }
    };

    // Register event listeners
    client.on('connection:established', handleConnectionEstablished);
    client.on('connection:authenticated', handleConnectionAuthenticated);
    client.on('connection:disconnected', handleConnectionDisconnected);
    client.on('connection:error', handleConnectionError);
    client.on('state:change', handleStateChange);
    client.on('reconnect:success', handleReconnectSuccess);
    client.on('reconnect:failed', handleReconnectFailed);
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
      client.off('reconnect:success', handleReconnectSuccess);
      client.off('reconnect:failed', handleReconnectFailed);
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

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      setIsSidebarLoading(true);
      try {
        const response = await listConversations({ sortBy: 'updatedAt', sortOrder: 'desc' });

        console.log('[Conversations] Raw response:', response);

        if (response.error) {
          console.error('[Conversations] Error fetching:', response.error);
          toast.error('Failed to load conversations');
          setConversations([]);
        } else if (response.data) {
          // Validate response structure
          if (!response.data.data || !Array.isArray(response.data.data)) {
            console.error('[Conversations] Invalid response structure:', response.data);
            toast.error('Invalid response from server');
            setConversations([]);
            return;
          }

          console.log('[Conversations] Loaded:', response.data.data.length);
          setConversations(response.data.data);

          // If no conversation is selected and we have conversations, select the first one
          if (!selectedConversationId && response.data.data.length > 0) {
            setSelectedConversationId(response.data.data[0].id);
          }
        }
      } catch (error) {
        console.error('[Conversations] Fetch error:', error);
        toast.error('Failed to load conversations');
        setConversations([]);
      } finally {
        setIsSidebarLoading(false);
      }
    };

    fetchConversations();
  }, []); // Run once on mount

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await listMessages({
          conversationId: selectedConversationId,
          sortOrder: 'asc', // Chronological order
        });

        if (response.error) {
          console.error('[Messages] Error fetching:', response.error);
          toast.error('Failed to load messages');
          setMessages([]);
        } else if (response.data) {
          console.log('[Messages] Loaded:', response.data.data.length);

          // Convert API messages to MessageType format
          const formattedMessages: MessageType[] = response.data.data.map((msg: APIMessage) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            status: 'sent' as const,
            metadata: msg.metadata,
          }));

          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('[Messages] Fetch error:', error);
        toast.error('Failed to load messages');
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversationId]); // Re-fetch when conversation changes

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev: boolean) => !prev);
  };

  // Handlers
  const handleNewChat = async () => {
    console.log('[Conversation] Creating new chat...');

    try {
      const response = await createConversation({
        title: 'New Conversation',
      });

      if (response.error) {
        console.error('[Conversation] Error creating:', response.error);
        toast.error('Failed to create conversation');
      } else if (response.data) {
        const createdConversation = response.data.data;  // Conversation is in data.data
        console.log('[Conversation] Created:', createdConversation.id);

        // Add to conversations list
        setConversations((prev) => [createdConversation, ...prev]);

        // Select the new conversation
        setSelectedConversationId(createdConversation.id);

        toast.success('New conversation created');
      }
    } catch (error) {
      console.error('[Conversation] Create error:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleSelectConversation = (id: string) => {
    console.log('[Conversation] Selected:', id);
    setSelectedConversationId(id);
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

  const handleRenameConversation = async (id: string) => {
    const newTitle = prompt('Enter new conversation title:');
    if (!newTitle) return;

    console.log('[Conversation] Renaming:', id, 'to:', newTitle);

    try {
      const response = await updateConversation(id, { title: newTitle });

      if (response.error) {
        console.error('[Conversation] Error renaming:', response.error);
        toast.error('Failed to rename conversation');
      } else if (response.data) {
        const updatedConversation = response.data.data;  // Conversation is in data.data
        console.log('[Conversation] Renamed:', updatedConversation.id);

        // Update conversations list with the updated conversation from backend
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === id ? updatedConversation : conv
          )
        );

        toast.success('Conversation renamed');
      }
    } catch (error) {
      console.error('[Conversation] Rename error:', error);
      toast.error('Failed to rename conversation');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    console.log('[Conversation] Deleting:', id);

    try {
      const response = await deleteConversationAPI(id);

      if (response.error) {
        console.error('[Conversation] Error deleting:', response.error);
        toast.error('Failed to delete conversation');
      } else {
        console.log('[Conversation] Deleted:', id);

        // Remove from conversations list
        setConversations((prev) => prev.filter((conv) => conv.id !== id));

        // If deleted conversation was selected, clear selection
        if (selectedConversationId === id) {
          setSelectedConversationId(null);
          setMessages([]);
        }

        toast.success('Conversation deleted');
      }
    } catch (error) {
      console.error('[Conversation] Delete error:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleExportConversation = (id: string) => {
    console.log('Export conversation:', id);
    // TODO: Implement export conversation functionality
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    console.log('[Message] Sending:', content, files);

    // Check if conversation is selected
    if (!selectedConversationId) {
      toast.error('No conversation selected');
      return;
    }

    // Check if WebSocket is connected
    if (!isConnected || !wsClient.current) {
      toast.error('Not connected to server. Please wait...');
      console.error('[Message] Cannot send - WebSocket not connected');
      return;
    }

    // Create temporary message ID for UI
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Create user message with 'sending' status
    const userMessage: MessageType = {
      id: tempMessageId,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      // 1. Persist message to database via REST API
      console.log('[Message] Persisting to database...');
      const response = await createMessageAPI({
        conversationId: selectedConversationId,
        content,
        role: 'user',
      });

      if (response.error) {
        console.error('[Message] Error persisting:', response.error);
        throw new Error(response.error.message || 'Failed to save message');
      }

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      const savedMessage = response.data.data;  // Message is in data.data
      console.log('[Message] Persisted to database:', savedMessage.id);

      // Update message with real ID from database
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId
            ? { ...msg, id: savedMessage.id, status: 'sent' as const }
            : msg
        )
      );

      // 2. Send via WebSocket for real-time AI response
      console.log('[Message] Sending via WebSocket for AI response...');
      wsClient.current.send('message:send', {
        messageId: savedMessage.id, // Use real database ID
        conversationId: selectedConversationId,
        content,
        timestamp: new Date().toISOString(),
      });

      console.log('[Message] Sent successfully:', savedMessage.id);
      setIsSending(false);
    } catch (error) {
      console.error('[Message] Failed to send:', error);

      // Update message status to error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId
            ? {
                ...msg,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Failed to send message',
              }
            : msg
        )
      );
      setIsSending(false);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
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

  const handleRetryMessage = (messageId: string) => {
    console.log('[Message] Retrying message:', messageId);

    // Find the failed message
    const failedMessage = messages.find((msg) => msg.id === messageId);
    if (!failedMessage) {
      console.error('[Message] Failed message not found:', messageId);
      toast.error('Message not found');
      return;
    }

    // Check if WebSocket is connected
    if (!isConnected || !wsClient.current) {
      toast.error('Not connected to server. Please wait and try again.');
      console.error('[Message] Cannot retry - WebSocket not connected');
      return;
    }

    // Update message status to 'sending'
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'sending' as const, error: undefined }
          : msg
      )
    );
    setIsSending(true);

    // Retry sending via WebSocket
    try {
      wsClient.current.send('message:send', {
        messageId,
        conversationId: selectedConversationId,
        content: failedMessage.content,
        timestamp: new Date().toISOString(),
      });

      console.log('[Message] Retry sent via WebSocket:', messageId);
      toast.info('Retrying message...');
    } catch (error) {
      console.error('[Message] Failed to retry:', error);

      // Update message status back to error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: 'error' as const, error: 'Failed to send message' }
            : msg
        )
      );
      setIsSending(false);
      toast.error('Failed to retry message');
    }
  };

  // Get selected conversation title
  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );
  const conversationTitle = selectedConversation?.title;

  // Update conversations with active state for sidebar
  const conversationsWithActive = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
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
          onRetry={handleRetryMessage}
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
