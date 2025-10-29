/**
 * WebSocket Typing Indicator Handlers
 * Handle typing:start and typing:stop events with auto-timeout
 */

import { ExtendedWebSocket, VibeWebSocketServer } from '../server';

/**
 * Typing event types
 */
export enum TypingEventType {
  START = 'typing:start',
  STOP = 'typing:stop',
}

/**
 * Typing start event
 */
export interface TypingStartEvent {
  type: TypingEventType.START;
  conversationId: string;
}

/**
 * Typing stop event
 */
export interface TypingStopEvent {
  type: TypingEventType.STOP;
  conversationId: string;
}

/**
 * Typing status broadcast event
 */
export interface TypingStatusEvent {
  type: TypingEventType.START | TypingEventType.STOP;
  conversationId: string;
  userId: string;
  timestamp: string;
}

/**
 * Union type for typing events
 */
export type TypingEvent = TypingStartEvent | TypingStopEvent;

/**
 * Typing state tracker
 */
interface TypingState {
  userId: string;
  conversationId: string;
  timeout: NodeJS.Timeout;
  lastUpdate: number;
}

/**
 * Typing Handlers class
 */
export class TypingHandlers {
  private wsServer: VibeWebSocketServer;

  // Map of userId+conversationId to typing state
  private typingStates: Map<string, TypingState>;

  // Auto-stop timeout duration (5 seconds)
  private readonly AUTO_STOP_TIMEOUT_MS = 5000;

  // Minimum time between typing events (prevents spam)
  private readonly MIN_UPDATE_INTERVAL_MS = 1000; // 1 second

  constructor(wsServer: VibeWebSocketServer) {
    this.wsServer = wsServer;
    this.typingStates = new Map();
  }

  /**
   * Generate unique key for typing state
   */
  private getStateKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  /**
   * Validate typing event format
   */
  private validateTypingEvent(data: unknown): data is TypingEvent {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const event = data as Record<string, unknown>;

    // Check required fields
    if (
      typeof event.type !== 'string' ||
      typeof event.conversationId !== 'string'
    ) {
      return false;
    }

    // Validate type
    return (
      event.type === TypingEventType.START ||
      event.type === TypingEventType.STOP
    );
  }

  /**
   * Broadcast typing status to conversation participants (excluding sender)
   */
  private broadcastTypingStatus(
    conversationId: string,
    userId: string,
    type: TypingEventType.START | TypingEventType.STOP
  ): void {
    const statusEvent: TypingStatusEvent = {
      type,
      conversationId,
      userId,
      timestamp: new Date().toISOString(),
    };

    // Get all connections in the conversation
    const connections = this.wsServer['connectionManager'].getConversationConnections(
      conversationId
    );

    // Send to all participants except the sender
    connections.forEach((ws) => {
      if (ws.userId !== userId && ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(JSON.stringify(statusEvent));
      }
    });
  }

  /**
   * Clear typing timeout for a user in a conversation
   */
  private clearTypingTimeout(userId: string, conversationId: string): void {
    const key = this.getStateKey(userId, conversationId);
    const state = this.typingStates.get(key);

    if (state) {
      clearTimeout(state.timeout);
      this.typingStates.delete(key);
    }
  }

  /**
   * Handle typing:start event
   */
  public handleTypingStart(
    ws: ExtendedWebSocket,
    event: TypingStartEvent
  ): void {
    const { conversationId } = event;
    const userId = ws.userId;

    if (!userId) {
      console.warn('Typing start event from unauthenticated connection');
      return;
    }

    const key = this.getStateKey(userId, conversationId);
    const now = Date.now();
    const existingState = this.typingStates.get(key);

    // Prevent spam: ignore if update is too soon
    if (
      existingState &&
      now - existingState.lastUpdate < this.MIN_UPDATE_INTERVAL_MS
    ) {
      console.log(
        `Typing start ignored for user ${userId}: too frequent (spam prevention)`
      );
      return;
    }

    // Clear existing timeout if present
    if (existingState) {
      clearTimeout(existingState.timeout);
    }

    // Create auto-stop timeout
    const timeout = setTimeout(() => {
      console.log(
        `Auto-stopping typing for user ${userId} in conversation ${conversationId}`
      );
      this.handleTypingStop(ws, {
        type: TypingEventType.STOP,
        conversationId,
      });
    }, this.AUTO_STOP_TIMEOUT_MS);

    // Update typing state
    this.typingStates.set(key, {
      userId,
      conversationId,
      timeout,
      lastUpdate: now,
    });

    // Broadcast to conversation participants
    this.broadcastTypingStatus(conversationId, userId, TypingEventType.START);

    console.log(
      `User ${userId} started typing in conversation ${conversationId}`
    );
  }

  /**
   * Handle typing:stop event
   */
  public handleTypingStop(
    ws: ExtendedWebSocket,
    event: TypingStopEvent
  ): void {
    const { conversationId } = event;
    const userId = ws.userId;

    if (!userId) {
      console.warn('Typing stop event from unauthenticated connection');
      return;
    }

    // Clear typing timeout and state
    this.clearTypingTimeout(userId, conversationId);

    // Broadcast to conversation participants
    this.broadcastTypingStatus(conversationId, userId, TypingEventType.STOP);

    console.log(`User ${userId} stopped typing in conversation ${conversationId}`);
  }

  /**
   * Handle incoming typing event
   */
  public handleTypingEvent(ws: ExtendedWebSocket, data: Buffer): void {
    try {
      const event = JSON.parse(data.toString());

      // Validate event format
      if (!this.validateTypingEvent(event)) {
        console.warn('Invalid typing event format:', event);
        return;
      }

      // Route to appropriate handler
      switch (event.type) {
        case TypingEventType.START:
          this.handleTypingStart(ws, event as TypingStartEvent);
          break;

        case TypingEventType.STOP:
          this.handleTypingStop(ws, event as TypingStopEvent);
          break;

        default:
          console.warn('Unknown typing event type:', (event as any).type);
      }
    } catch (error) {
      console.error('Error handling typing event:', error);
    }
  }

  /**
   * Clear all typing states for a user (called on disconnect)
   */
  public clearUserTypingStates(userId: string): void {
    const keysToDelete: string[] = [];

    // Find all typing states for this user
    this.typingStates.forEach((state, key) => {
      if (state.userId === userId) {
        clearTimeout(state.timeout);
        keysToDelete.push(key);

        // Broadcast stop event to participants
        this.broadcastTypingStatus(
          state.conversationId,
          userId,
          TypingEventType.STOP
        );
      }
    });

    // Remove all states
    keysToDelete.forEach((key) => this.typingStates.delete(key));

    if (keysToDelete.length > 0) {
      console.log(
        `Cleared ${keysToDelete.length} typing state(s) for user ${userId}`
      );
    }
  }

  /**
   * Clear all typing states (used during shutdown)
   */
  public clear(): void {
    this.typingStates.forEach((state) => {
      clearTimeout(state.timeout);
    });
    this.typingStates.clear();
    console.log('All typing states cleared');
  }

  /**
   * Get statistics about typing states
   */
  public getStats(): {
    activeTypingUsers: number;
  } {
    return {
      activeTypingUsers: this.typingStates.size,
    };
  }
}
