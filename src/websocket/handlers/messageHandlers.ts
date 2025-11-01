/**
 * WebSocket Message Handlers
 * Handle message send, receive, stream events with validation and rate limiting
 * VBT-42: Integrated with AI Provider Abstraction Layer
 */

import { ExtendedWebSocket, VibeWebSocketServer } from '../server';
import { AIIntegrationHandler } from './aiIntegration';

/**
 * Message event types
 */
export enum MessageEventType {
  SEND = 'message:send',
  RECEIVE = 'message:receive',
  STREAM = 'message:stream',
  ACK = 'message:ack',
  ERROR = 'message:error',
}

/**
 * Base message interface
 */
interface BaseMessage {
  type: MessageEventType;
  timestamp?: string;
  messageId?: string;
}

/**
 * Message send event
 */
export interface MessageSendEvent extends BaseMessage {
  type: MessageEventType.SEND;
  conversationId: string;
  content: string;
  messageId: string;
}

/**
 * Message receive event (broadcasted to participants)
 */
export interface MessageReceiveEvent extends BaseMessage {
  type: MessageEventType.RECEIVE;
  conversationId: string;
  content: string;
  messageId: string;
  userId: string;
  timestamp: string;
}

/**
 * Message stream event (for AI response streaming)
 */
export interface MessageStreamEvent extends BaseMessage {
  type: MessageEventType.STREAM;
  conversationId: string;
  content: string;
  messageId: string;
  isComplete: boolean;
}

/**
 * Message acknowledgment event
 */
export interface MessageAckEvent extends BaseMessage {
  type: MessageEventType.ACK;
  messageId: string;
  status: 'received' | 'delivered' | 'error';
  error?: string;
}

/**
 * Union type for all message events
 */
export type MessageEvent =
  | MessageSendEvent
  | MessageReceiveEvent
  | MessageStreamEvent
  | MessageAckEvent;

/**
 * Rate limiter for message sending
 * Prevents spam by limiting messages per user per time window
 */
class MessageRateLimiter {
  private userMessageCounts: Map<string, { count: number; resetTime: number }>;
  private maxMessagesPerWindow: number;
  private windowMs: number;

  constructor(maxMessagesPerWindow = 10, windowMs = 60000) {
    // Default: 10 messages per minute
    this.userMessageCounts = new Map();
    this.maxMessagesPerWindow = maxMessagesPerWindow;
    this.windowMs = windowMs;
  }

  /**
   * Check if user is rate limited
   */
  public isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userRecord = this.userMessageCounts.get(userId);

    if (!userRecord || now > userRecord.resetTime) {
      // Start new window
      this.userMessageCounts.set(userId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (userRecord.count >= this.maxMessagesPerWindow) {
      return true;
    }

    // Increment count
    userRecord.count++;
    return false;
  }

  /**
   * Get remaining time until rate limit resets (in seconds)
   */
  public getResetTime(userId: string): number {
    const userRecord = this.userMessageCounts.get(userId);
    if (!userRecord) return 0;

    const now = Date.now();
    return Math.ceil((userRecord.resetTime - now) / 1000);
  }

  /**
   * Clear all rate limit data
   */
  public clear(): void {
    this.userMessageCounts.clear();
  }
}

/**
 * Message Handlers class
 */
export class MessageHandlers {
  private wsServer: VibeWebSocketServer;
  private rateLimiter: MessageRateLimiter;
  private aiHandler: AIIntegrationHandler | null = null;
  private aiEnabled: boolean = false;

  constructor(wsServer: VibeWebSocketServer, enableAI: boolean = false) {
    this.wsServer = wsServer;
    this.rateLimiter = new MessageRateLimiter(10, 60000); // 10 messages per minute
    this.aiEnabled = enableAI;

    if (enableAI) {
      console.log('AI integration enabled for message handlers');
      this.aiHandler = new AIIntegrationHandler(wsServer);
    }
  }

  /**
   * Initialize AI handler (if enabled)
   */
  public async initialize(): Promise<void> {
    if (this.aiHandler) {
      await this.aiHandler.initialize();
    }
  }

  /**
   * Enable or disable AI responses
   */
  public setAIEnabled(enabled: boolean): void {
    this.aiEnabled = enabled;
    console.log(`AI responses ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if AI is enabled and ready
   */
  public isAIReady(): boolean {
    return this.aiEnabled && this.aiHandler !== null && this.aiHandler.isReady();
  }

  /**
   * Validate message format
   */
  private validateMessage(data: unknown): data is MessageEvent {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const msg = data as Record<string, unknown>;

    // Check required type field
    if (typeof msg.type !== 'string') {
      return false;
    }

    // Validate based on message type
    switch (msg.type) {
      case MessageEventType.SEND:
        return (
          typeof msg.conversationId === 'string' &&
          typeof msg.content === 'string' &&
          typeof msg.messageId === 'string' &&
          msg.content.length > 0 &&
          msg.content.length <= 10000 // Max message length
        );

      case MessageEventType.STREAM:
        return (
          typeof msg.conversationId === 'string' &&
          typeof msg.content === 'string' &&
          typeof msg.messageId === 'string' &&
          typeof msg.isComplete === 'boolean'
        );

      default:
        return false;
    }
  }

  /**
   * Send acknowledgment to client
   */
  private sendAck(
    ws: ExtendedWebSocket,
    messageId: string,
    status: 'received' | 'delivered' | 'error',
    error?: string
  ): void {
    const ackEvent: MessageAckEvent = {
      type: MessageEventType.ACK,
      messageId,
      status,
      error,
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(ackEvent));
    }
  }

  /**
   * Handle message:send event
   * Client sends a message to a conversation
   */
  public handleSend(ws: ExtendedWebSocket, message: MessageSendEvent): void {
    const { conversationId, content, messageId } = message;
    const userId = ws.userId;

    if (!userId) {
      this.sendAck(ws, messageId, 'error', 'User not authenticated');
      return;
    }

    // Check rate limiting
    if (this.rateLimiter.isRateLimited(userId)) {
      const resetTime = this.rateLimiter.getResetTime(userId);
      this.sendAck(
        ws,
        messageId,
        'error',
        `Rate limit exceeded. Try again in ${resetTime} seconds`
      );
      return;
    }

    // Auto-join conversation if not already joined
    if (ws.conversationId !== conversationId) {
      console.log(`Auto-joining user ${userId} to conversation ${conversationId}`);
      this.wsServer.joinConversation(ws, conversationId);
    }

    // Send acknowledgment that message was received
    this.sendAck(ws, messageId, 'received');

    console.log(
      `Message received from user ${userId} for conversation ${conversationId}`
    );

    // Broadcast message to all participants in the conversation
    const receiveEvent: MessageReceiveEvent = {
      type: MessageEventType.RECEIVE,
      conversationId,
      content,
      messageId,
      userId,
      timestamp: new Date().toISOString(),
    };

    this.wsServer.sendToConversation(conversationId, receiveEvent);

    // Send delivered acknowledgment
    this.sendAck(ws, messageId, 'delivered');

    console.log(`Message ${messageId} delivered to conversation ${conversationId}`);

    // Generate AI response if enabled
    if (this.isAIReady()) {
      console.log(`Triggering AI response for message ${messageId}`);
      this.aiHandler!.generateAIResponse({
        conversationId,
        userId,
        messageId,
        content,
      }).catch((error) => {
        console.error('Failed to generate AI response:', error);
        // Error already sent to conversation by aiHandler
      });
    }
  }

  /**
   * Handle message:stream event
   * Used for streaming AI responses chunk by chunk
   */
  public handleStream(ws: ExtendedWebSocket, message: MessageStreamEvent): void {
    const { conversationId, content, messageId, isComplete } = message;
    const userId = ws.userId;

    if (!userId) {
      console.warn('Attempted stream from unauthenticated connection');
      return;
    }

    console.log(
      `Streaming message chunk for conversation ${conversationId} (complete: ${isComplete})`
    );

    // Broadcast stream chunk to all participants in the conversation
    const streamEvent: MessageStreamEvent = {
      type: MessageEventType.STREAM,
      conversationId,
      content,
      messageId,
      isComplete,
      timestamp: new Date().toISOString(),
    };

    this.wsServer.sendToConversation(conversationId, streamEvent);

    if (isComplete) {
      console.log(`Message stream ${messageId} completed`);
    }
  }

  /**
   * Route incoming message to appropriate handler
   */
  public handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      // Validate message format
      if (!this.validateMessage(message)) {
        console.warn('Invalid message format received:', message);
        ws.send(
          JSON.stringify({
            type: MessageEventType.ERROR,
            message: 'Invalid message format',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // Route to appropriate handler
      switch (message.type) {
        case MessageEventType.SEND:
          this.handleSend(ws, message as MessageSendEvent);
          break;

        case MessageEventType.STREAM:
          this.handleStream(ws, message as MessageStreamEvent);
          break;

        default:
          console.warn('Unknown message type:', message.type);
          ws.send(
            JSON.stringify({
              type: MessageEventType.ERROR,
              message: `Unknown message type: ${message.type}`,
              timestamp: new Date().toISOString(),
            })
          );
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(
        JSON.stringify({
          type: MessageEventType.ERROR,
          message: 'Failed to process message',
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Clear rate limiter data and AI handler
   */
  public async clear(): Promise<void> {
    this.rateLimiter.clear();
    if (this.aiHandler) {
      await this.aiHandler.shutdown();
    }
  }

  /**
   * Get AI handler stats
   */
  public getAIStats() {
    return this.aiHandler?.getStats() || { ready: false };
  }
}
