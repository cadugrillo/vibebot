export type MessageRole = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  error?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
  };
}

export interface MessageProps {
  message: Message;
  onRetry?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  showAvatar?: boolean;
  isStreaming?: boolean;
}
