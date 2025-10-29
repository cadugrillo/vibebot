/**
 * WebSocket Cleanup Utility
 * Centralized resource cleanup on disconnect
 */

import { ExtendedWebSocket } from './server';
import { ConnectionManager } from './connectionManager';
import { TypingHandlers } from './handlers/typingHandlers';
import { StatusHandlers } from './handlers/statusHandlers';

/**
 * Disconnect types
 */
export enum DisconnectType {
  GRACEFUL = 'graceful', // Normal client disconnect
  FORCED = 'forced', // Server-initiated disconnect
  TIMEOUT = 'timeout', // Connection timeout
  ERROR = 'error', // Error-triggered disconnect
  SHUTDOWN = 'shutdown', // Server shutdown
}

/**
 * Cleanup context
 */
export interface CleanupContext {
  disconnectType: DisconnectType;
  code: number;
  reason: string;
  userId?: string;
  conversationId?: string;
  connectionDuration: number;
  timestamp: Date;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  success: boolean;
  cleanedResources: string[];
  errors: Array<{ resource: string; error: string }>;
  context: CleanupContext;
}

/**
 * Cleanup Manager class
 */
export class CleanupManager {
  /**
   * Determine disconnect type based on close code
   */
  private static getDisconnectType(code: number): DisconnectType {
    // Normal closure codes (1000-1015)
    if (code === 1000) return DisconnectType.GRACEFUL;
    if (code === 1001) return DisconnectType.SHUTDOWN;
    if (code === 1006) return DisconnectType.TIMEOUT; // Abnormal closure
    if (code === 1008) return DisconnectType.FORCED; // Policy violation
    if (code >= 4000) return DisconnectType.ERROR; // Application error

    return DisconnectType.FORCED;
  }

  /**
   * Create cleanup context from disconnect event
   */
  private static createContext(
    ws: ExtendedWebSocket,
    code: number,
    reason: string
  ): CleanupContext {
    const disconnectType = this.getDisconnectType(code);
    const connectionDuration = Date.now() - ws.connectedAt.getTime();

    return {
      disconnectType,
      code,
      reason: reason || 'No reason provided',
      userId: ws.userId,
      conversationId: ws.conversationId,
      connectionDuration,
      timestamp: new Date(),
    };
  }

  /**
   * Send disconnect notification to client
   */
  private static async sendDisconnectNotification(
    ws: ExtendedWebSocket,
    context: CleanupContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only send if connection is still open enough to receive
      if (ws.readyState === 1 || ws.readyState === 2) {
        // OPEN or CLOSING
        StatusHandlers.sendDisconnected(ws, context.code, context.reason);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear typing indicators
   */
  private static async clearTypingState(
    typingHandlers: TypingHandlers,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      typingHandlers.clearUserTypingStates(userId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove connection from manager
   */
  private static async removeConnection(
    connectionManager: ConnectionManager,
    ws: ExtendedWebSocket
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const removed = connectionManager.removeConnection(ws);
      return { success: removed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log disconnect event
   */
  private static async logDisconnect(
    ws: ExtendedWebSocket,
    context: CleanupContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const logData = {
        disconnectType: context.disconnectType,
        code: context.code,
        reason: context.reason,
        userId: context.userId || 'unauthenticated',
        conversationId: context.conversationId,
        connectionDuration: `${context.connectionDuration}ms`,
        timestamp: context.timestamp.toISOString(),
      };

      console.log('WebSocket disconnect:', JSON.stringify(logData, null, 2));

      // Also use status handler logging
      StatusHandlers.logConnectionEvent('connection:disconnected' as any, ws, {
        ...logData,
        duration: context.connectionDuration,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up event listeners (WebSocket automatically handles this, but we track it)
   */
  private static async cleanupEventListeners(
    // @ts-expect-error - Reserved for future use (custom listener tracking)
    ws: ExtendedWebSocket
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // WebSocket will automatically remove event listeners on close
      // We just track that this cleanup step completed
      // In future, we might track custom listeners here

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clean up pending timers (future: track message stream timers)
   */
  private static async cleanupTimers(
    // @ts-expect-error - Reserved for future use (message stream timer tracking)
    ws: ExtendedWebSocket
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Future: Clear any message stream timers associated with this connection
      // For now, typing indicator timers are handled by clearTypingState

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform complete cleanup on disconnect
   */
  public static async cleanup(
    ws: ExtendedWebSocket,
    code: number,
    reason: string,
    connectionManager: ConnectionManager,
    typingHandlers: TypingHandlers
  ): Promise<CleanupResult> {
    const context = this.createContext(ws, code, reason);
    const cleanedResources: string[] = [];
    const errors: Array<{ resource: string; error: string }> = [];

    console.log(
      `Starting cleanup for ${context.disconnectType} disconnect (code: ${code})`
    );

    // Step 1: Send disconnect notification (best effort)
    const notificationResult = await this.sendDisconnectNotification(ws, context);
    if (notificationResult.success) {
      cleanedResources.push('disconnect_notification');
    } else if (notificationResult.error) {
      errors.push({ resource: 'disconnect_notification', error: notificationResult.error });
    }

    // Step 2: Clear typing indicators
    if (context.userId) {
      const typingResult = await this.clearTypingState(typingHandlers, context.userId);
      if (typingResult.success) {
        cleanedResources.push('typing_indicators');
      } else if (typingResult.error) {
        errors.push({ resource: 'typing_indicators', error: typingResult.error });
      }
    }

    // Step 3: Clean up timers
    const timersResult = await this.cleanupTimers(ws);
    if (timersResult.success) {
      cleanedResources.push('timers');
    } else if (timersResult.error) {
      errors.push({ resource: 'timers', error: timersResult.error });
    }

    // Step 4: Clean up event listeners
    const listenersResult = await this.cleanupEventListeners(ws);
    if (listenersResult.success) {
      cleanedResources.push('event_listeners');
    } else if (listenersResult.error) {
      errors.push({ resource: 'event_listeners', error: listenersResult.error });
    }

    // Step 5: Remove from connection manager (critical step - do last)
    const connectionResult = await this.removeConnection(connectionManager, ws);
    if (connectionResult.success) {
      cleanedResources.push('connection_manager');
    } else if (connectionResult.error) {
      errors.push({ resource: 'connection_manager', error: connectionResult.error });
    }

    // Step 6: Log disconnect event
    const logResult = await this.logDisconnect(ws, context);
    if (logResult.success) {
      cleanedResources.push('disconnect_log');
    } else if (logResult.error) {
      errors.push({ resource: 'disconnect_log', error: logResult.error });
    }

    const success = errors.length === 0;

    if (success) {
      console.log(
        `Cleanup completed successfully. Resources cleaned: ${cleanedResources.join(', ')}`
      );
    } else {
      console.error(
        `Cleanup completed with ${errors.length} error(s):`,
        errors
      );
    }

    return {
      success,
      cleanedResources,
      errors,
      context,
    };
  }

  /**
   * Handle graceful disconnect (client initiated)
   */
  public static async handleGracefulDisconnect(
    ws: ExtendedWebSocket,
    code: number,
    reason: string,
    connectionManager: ConnectionManager,
    typingHandlers: TypingHandlers
  ): Promise<CleanupResult> {
    console.log('Handling graceful disconnect...');
    return this.cleanup(ws, code, reason, connectionManager, typingHandlers);
  }

  /**
   * Handle forced disconnect (server or error initiated)
   */
  public static async handleForcedDisconnect(
    ws: ExtendedWebSocket,
    code: number,
    reason: string,
    connectionManager: ConnectionManager,
    typingHandlers: TypingHandlers
  ): Promise<CleanupResult> {
    console.log('Handling forced disconnect...');
    return this.cleanup(ws, code, reason, connectionManager, typingHandlers);
  }
}
