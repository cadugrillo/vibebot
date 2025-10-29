/**
 * WebSocket Connection Status Handlers
 * Handle connection lifecycle events (connect, authenticate, disconnect, error)
 */

import { ExtendedWebSocket } from '../server';

/**
 * Connection status event types
 */
export enum ConnectionStatusType {
  ESTABLISHED = 'connection:established',
  AUTHENTICATED = 'connection:authenticated',
  DISCONNECTED = 'connection:disconnected',
  ERROR = 'connection:error',
  RECONNECTED = 'connection:reconnected',
}

/**
 * Connection established event
 */
export interface ConnectionEstablishedEvent {
  type: ConnectionStatusType.ESTABLISHED;
  timestamp: string;
  serverVersion?: string;
}

/**
 * Connection authenticated event
 */
export interface ConnectionAuthenticatedEvent {
  type: ConnectionStatusType.AUTHENTICATED;
  userId: string;
  connectionId: string;
  timestamp: string;
}

/**
 * Connection disconnected event
 */
export interface ConnectionDisconnectedEvent {
  type: ConnectionStatusType.DISCONNECTED;
  code: number;
  reason: string;
  timestamp: string;
}

/**
 * Connection error event
 */
export interface ConnectionErrorEvent {
  type: ConnectionStatusType.ERROR;
  message: string;
  code?: string;
  timestamp: string;
}

/**
 * Connection reconnected event
 */
export interface ConnectionReconnectedEvent {
  type: ConnectionStatusType.RECONNECTED;
  userId: string;
  previousConnectionId?: string;
  timestamp: string;
}

/**
 * Union type for all connection status events
 */
export type ConnectionStatusEvent =
  | ConnectionEstablishedEvent
  | ConnectionAuthenticatedEvent
  | ConnectionDisconnectedEvent
  | ConnectionErrorEvent
  | ConnectionReconnectedEvent;

/**
 * Status Handlers class
 */
export class StatusHandlers {
  /**
   * Send connection established event
   * Sent immediately when WebSocket connection is opened
   */
  public static sendEstablished(ws: ExtendedWebSocket): void {
    const event: ConnectionEstablishedEvent = {
      type: ConnectionStatusType.ESTABLISHED,
      timestamp: new Date().toISOString(),
      serverVersion: process.env.npm_package_version || '1.0.0',
    };

    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(event));
      console.log('Sent connection:established event');
    }
  }

  /**
   * Send connection authenticated event
   * Sent after successful JWT authentication
   */
  public static sendAuthenticated(
    ws: ExtendedWebSocket,
    connectionId: string
  ): void {
    if (!ws.userId) {
      console.warn('Cannot send authenticated event without userId');
      return;
    }

    const event: ConnectionAuthenticatedEvent = {
      type: ConnectionStatusType.AUTHENTICATED,
      userId: ws.userId,
      connectionId,
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(event));
      console.log(`Sent connection:authenticated event for user ${ws.userId}`);
    }
  }

  /**
   * Send connection disconnected event
   * Sent just before closing the connection
   */
  public static sendDisconnected(
    ws: ExtendedWebSocket,
    code: number,
    reason: string
  ): void {
    const event: ConnectionDisconnectedEvent = {
      type: ConnectionStatusType.DISCONNECTED,
      code,
      reason: reason || 'Connection closed',
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(event));
      console.log(`Sent connection:disconnected event (code: ${code})`);
    }
  }

  /**
   * Send connection error event
   * Sent when an error occurs during connection lifecycle
   */
  public static sendError(
    ws: ExtendedWebSocket,
    message: string,
    code?: string
  ): void {
    const event: ConnectionErrorEvent = {
      type: ConnectionStatusType.ERROR,
      message,
      code,
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1 || ws.readyState === 0) {
      // OPEN or CONNECTING
      ws.send(JSON.stringify(event));
      console.log(`Sent connection:error event: ${message} (code: ${code})`);
    }
  }

  /**
   * Send connection reconnected event
   * Sent when a user reconnects with a new WebSocket
   */
  public static sendReconnected(
    ws: ExtendedWebSocket,
    previousConnectionId?: string
  ): void {
    if (!ws.userId) {
      console.warn('Cannot send reconnected event without userId');
      return;
    }

    const event: ConnectionReconnectedEvent = {
      type: ConnectionStatusType.RECONNECTED,
      userId: ws.userId,
      previousConnectionId,
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(event));
      console.log(
        `Sent connection:reconnected event for user ${ws.userId}`
      );
    }
  }

  /**
   * Log connection lifecycle event
   */
  public static logConnectionEvent(
    event: ConnectionStatusType,
    ws: ExtendedWebSocket,
    details?: Record<string, unknown>
  ): void {
    const logData = {
      event,
      userId: ws.userId || 'unauthenticated',
      connectedAt: ws.connectedAt?.toISOString(),
      remoteAddress: 'hidden', // Would come from IncomingMessage in real implementation
      ...details,
    };

    console.log('Connection lifecycle event:', JSON.stringify(logData));
  }
}
