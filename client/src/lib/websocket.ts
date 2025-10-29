/**
 * WebSocket Client Utility
 * Provides real-time communication with the server using WebSocket
 * Features:
 * - Event emitter pattern for easy subscription
 * - Automatic reconnection with exponential backoff
 * - Message queuing while disconnected
 * - JWT authentication
 */

import { ReconnectionManager, MessageQueue } from './websocketReconnection';
import { TokenStorage } from '../utils/tokenStorage';

/**
 * WebSocket connection states
 */
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

/**
 * WebSocket event types
 */
export type WebSocketEventType =
  // Connection events
  | 'connection:established'
  | 'connection:authenticated'
  | 'connection:disconnected'
  | 'connection:error'
  // Message events
  | 'message:send'
  | 'message:receive'
  | 'message:stream'
  | 'message:ack'
  // Typing events
  | 'typing:start'
  | 'typing:stop'
  // Client-side events
  | 'state:change'
  | 'reconnect:attempt'
  | 'reconnect:failed'
  | 'reconnect:success';

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * WebSocket event data interfaces
 */
export interface ConnectionEstablishedEvent {
  type: 'connection:established';
  timestamp: string;
}

export interface ConnectionAuthenticatedEvent {
  type: 'connection:authenticated';
  connectionId: string;
  timestamp: string;
}

export interface ConnectionDisconnectedEvent {
  type: 'connection:disconnected';
  code: number;
  reason: string;
  timestamp: string;
}

export interface ConnectionErrorEvent {
  type: 'connection:error';
  message: string;
  code?: string;
  timestamp: string;
}

export interface MessageSendEvent {
  type: 'message:send';
  messageId: string;
  conversationId: string;
  content: string;
  timestamp: string;
}

export interface MessageReceiveEvent {
  type: 'message:receive';
  messageId: string;
  conversationId: string;
  content: string;
  senderId: string;
  timestamp: string;
}

export interface MessageStreamEvent {
  type: 'message:stream';
  messageId: string;
  conversationId: string;
  chunk: string;
  isComplete: boolean;
  timestamp: string;
}

export interface MessageAckEvent {
  type: 'message:ack';
  messageId: string;
  status: 'success' | 'error';
  message?: string;
  timestamp: string;
}

export interface TypingStartEvent {
  type: 'typing:start';
  conversationId: string;
  userId: string;
  timestamp: string;
}

export interface TypingStopEvent {
  type: 'typing:stop';
  conversationId: string;
  userId: string;
  timestamp: string;
}

export interface StateChangeEvent {
  type: 'state:change';
  previousState: ConnectionState;
  currentState: ConnectionState;
  timestamp: string;
}

export interface ReconnectAttemptEvent {
  type: 'reconnect:attempt';
  attemptNumber: number;
  maxAttempts: number;
  delay: number;
  timestamp: string;
}

export interface ReconnectFailedEvent {
  type: 'reconnect:failed';
  reason: string;
  timestamp: string;
}

export interface ReconnectSuccessEvent {
  type: 'reconnect:success';
  attemptNumber: number;
  timestamp: string;
}

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  url?: string;
  reconnectionConfig?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    jitterEnabled?: boolean;
  };
  messageQueueSize?: number;
  autoConnect?: boolean;
}

/**
 * WebSocket Client class
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectionManager: ReconnectionManager;
  private messageQueue: MessageQueue;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private connectionId: string | null = null;

  /**
   * Default configuration
   */
  private static readonly DEFAULT_CONFIG: Required<WebSocketConfig> = {
    url: 'ws://localhost:5000/ws',
    reconnectionConfig: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
    },
    messageQueueSize: 100,
    autoConnect: false,
  };

  constructor(config?: WebSocketConfig) {
    this.config = {
      ...WebSocketClient.DEFAULT_CONFIG,
      ...config,
      reconnectionConfig: {
        ...WebSocketClient.DEFAULT_CONFIG.reconnectionConfig,
        ...config?.reconnectionConfig,
      },
    };

    this.reconnectionManager = new ReconnectionManager(this.config.reconnectionConfig);
    this.messageQueue = new MessageQueue(this.config.messageQueueSize);

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected and authenticated
   */
  public isConnected(): boolean {
    return (
      this.state === ConnectionState.AUTHENTICATED &&
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  /**
   * Get current connection ID
   */
  public getConnectionId(): string | null {
    return this.connectionId;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.warn('WebSocket already connected or connecting');
      return;
    }

    // Get authentication token
    const token = TokenStorage.getAccessToken();
    if (!token) {
      console.error('No authentication token found');
      this.setState(ConnectionState.ERROR);
      this.emit('connection:error', {
        type: 'connection:error',
        message: 'Authentication token not found',
        code: 'AUTH_TOKEN_MISSING',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Build WebSocket URL with token
    const url = `${this.config.url}?token=${encodeURIComponent(token)}`;

    console.log('Connecting to WebSocket server...');
    this.setState(ConnectionState.CONNECTING);

    try {
      this.ws = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.setState(ConnectionState.ERROR);
      this.handleConnectionError(error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log('Disconnecting from WebSocket server...');

    // Cancel any pending reconnection
    this.reconnectionManager.cancelReconnect();

    // Clear message queue
    this.messageQueue.clear();

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client initiated disconnect');
      this.ws = null;
    }

    this.connectionId = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Send message to server
   */
  public send<T = any>(type: string, data: T): void {
    const message = {
      type,
      ...data,
      timestamp: new Date().toISOString(),
    };

    // If not connected, queue the message
    if (!this.isConnected()) {
      console.log('Not connected, queueing message:', type);
      this.messageQueue.enqueue(type, message);
      return;
    }

    // Send message
    try {
      this.ws!.send(JSON.stringify(message));
      console.log('Sent message:', type);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Queue message on send failure
      this.messageQueue.enqueue(type, message);
    }
  }

  /**
   * Subscribe to event
   */
  public on<T = any>(event: WebSocketEventType, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from event
   */
  public off<T = any>(event: WebSocketEventType, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Unsubscribe from all events
   */
  public offAll(event?: WebSocketEventType): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * Emit event to all subscribers
   */
  private emit<T = any>(event: WebSocketEventType, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Update connection state and emit state change event
   */
  private setState(newState: ConnectionState): void {
    const previousState = this.state;
    this.state = newState;

    console.log(`Connection state changed: ${previousState} → ${newState}`);

    this.emit('state:change', {
      type: 'state:change',
      previousState,
      currentState: newState,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection opened');
      this.setState(ConnectionState.CONNECTED);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.setState(ConnectionState.ERROR);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.handleDisconnect(event.code, event.reason);
    };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const eventType = message.type as WebSocketEventType;

      console.log('Received message:', eventType);

      // Handle connection authentication
      if (eventType === 'connection:authenticated') {
        this.connectionId = message.connectionId;
        this.setState(ConnectionState.AUTHENTICATED);
        this.reconnectionManager.reset();
        this.flushMessageQueue();
      }

      // Emit event to subscribers
      this.emit(eventType, message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(code: number, reason: string): void {
    this.setState(ConnectionState.DISCONNECTED);
    this.connectionId = null;

    this.emit('connection:disconnected', {
      type: 'connection:disconnected',
      code,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Attempt reconnection if not a normal closure
    if (code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    this.emit('connection:error', {
      type: 'connection:error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Attempt reconnection on error
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.reconnectionManager.canRetry()) {
      console.warn('Max reconnection attempts reached');
      this.setState(ConnectionState.ERROR);
      this.emit('reconnect:failed', {
        type: 'reconnect:failed',
        reason: 'Max reconnection attempts reached',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.setState(ConnectionState.RECONNECTING);

    const reconnectState = this.reconnectionManager.getState();
    this.emit('reconnect:attempt', {
      type: 'reconnect:attempt',
      attemptNumber: reconnectState.attemptNumber + 1,
      maxAttempts: this.reconnectionManager.getConfig().maxRetries,
      delay: reconnectState.nextRetryDelay || 0,
      timestamp: new Date().toISOString(),
    });

    this.reconnectionManager.scheduleReconnect(
      () => {
        console.log('Attempting reconnection...');
        this.connect();
      },
      () => {
        console.error('Max reconnection attempts reached');
        this.setState(ConnectionState.ERROR);
        this.emit('reconnect:failed', {
          type: 'reconnect:failed',
          reason: 'Max reconnection attempts reached',
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * Flush queued messages after reconnection
   */
  private flushMessageQueue(): void {
    const queuedMessages = this.messageQueue.dequeueAll();

    if (queuedMessages.length > 0) {
      console.log(`Flushing ${queuedMessages.length} queued messages`);

      queuedMessages.forEach((msg) => {
        try {
          this.ws!.send(JSON.stringify(msg.data));
        } catch (error) {
          console.error('Failed to flush queued message:', error);
        }
      });

      this.emit('reconnect:success', {
        type: 'reconnect:success',
        attemptNumber: this.reconnectionManager.getState().attemptNumber,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get reconnection manager for advanced control
   */
  public getReconnectionManager(): ReconnectionManager {
    return this.reconnectionManager;
  }

  /**
   * Get message queue for inspection
   */
  public getMessageQueue(): MessageQueue {
    return this.messageQueue;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.disconnect();
    this.offAll();
    this.reconnectionManager.cancelReconnect();
    this.messageQueue.clear();
  }
}

/**
 * Create a singleton WebSocket client instance
 */
let globalClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!globalClient) {
    globalClient = new WebSocketClient(config);
  }
  return globalClient;
}

export function destroyWebSocketClient(): void {
  if (globalClient) {
    globalClient.destroy();
    globalClient = null;
  }
}
