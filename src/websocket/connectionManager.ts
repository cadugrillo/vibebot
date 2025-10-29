/**
 * WebSocket Connection Manager
 * Centralized tracking of WebSocket connections by user and conversation
 */

import { ExtendedWebSocket } from './server';

/**
 * Connection metadata interface
 */
export interface ConnectionMetadata {
  ws: ExtendedWebSocket;
  userId: string;
  conversationId?: string;
  connectedAt: Date;
}

/**
 * ConnectionManager class
 * Manages WebSocket connections with support for multiple connections per user
 */
export class ConnectionManager {
  // Map of connection ID to metadata
  private connections: Map<string, ConnectionMetadata>;

  // Map of userId to Set of connection IDs (supports multi-tab)
  private userConnections: Map<string, Set<string>>;

  // Map of conversationId to Set of connection IDs
  private conversationConnections: Map<string, Set<string>>;

  constructor() {
    this.connections = new Map();
    this.userConnections = new Map();
    this.conversationConnections = new Map();
  }

  /**
   * Generate unique connection ID from WebSocket
   */
  private getConnectionId(ws: ExtendedWebSocket): string {
    // Use a combination of userId and timestamp for uniqueness
    const timestamp = ws.connectedAt.getTime();
    const random = Math.random().toString(36).substring(2, 9);
    return `${ws.userId}-${timestamp}-${random}`;
  }

  /**
   * Add a new connection to tracking
   */
  public addConnection(ws: ExtendedWebSocket): string {
    if (!ws.userId) {
      throw new Error('Cannot add connection without userId');
    }

    const connectionId = this.getConnectionId(ws);

    // Store connection metadata
    const metadata: ConnectionMetadata = {
      ws,
      userId: ws.userId,
      conversationId: ws.conversationId,
      connectedAt: ws.connectedAt,
    };

    this.connections.set(connectionId, metadata);

    // Track by user ID (multi-tab support)
    if (!this.userConnections.has(ws.userId)) {
      this.userConnections.set(ws.userId, new Set());
    }
    this.userConnections.get(ws.userId)!.add(connectionId);

    // Track by conversation ID if present
    if (ws.conversationId) {
      if (!this.conversationConnections.has(ws.conversationId)) {
        this.conversationConnections.set(ws.conversationId, new Set());
      }
      this.conversationConnections.get(ws.conversationId)!.add(connectionId);
    }

    console.log(
      `Connection added: ${connectionId} (user: ${ws.userId}, conversation: ${ws.conversationId || 'none'})`
    );

    return connectionId;
  }

  /**
   * Remove a connection from tracking
   */
  public removeConnection(ws: ExtendedWebSocket): boolean {
    // Find connection ID by matching WebSocket instance
    let connectionId: string | null = null;

    for (const [id, metadata] of this.connections.entries()) {
      if (metadata.ws === ws) {
        connectionId = id;
        break;
      }
    }

    if (!connectionId) {
      console.warn('Connection not found in manager');
      return false;
    }

    const metadata = this.connections.get(connectionId);
    if (!metadata) {
      return false;
    }

    // Remove from main map
    this.connections.delete(connectionId);

    // Remove from user connections
    const userConns = this.userConnections.get(metadata.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(metadata.userId);
      }
    }

    // Remove from conversation connections
    if (metadata.conversationId) {
      const convConns = this.conversationConnections.get(metadata.conversationId);
      if (convConns) {
        convConns.delete(connectionId);
        if (convConns.size === 0) {
          this.conversationConnections.delete(metadata.conversationId);
        }
      }
    }

    console.log(
      `Connection removed: ${connectionId} (user: ${metadata.userId}, conversation: ${metadata.conversationId || 'none'})`
    );

    return true;
  }

  /**
   * Get connection metadata by WebSocket instance
   */
  public getConnection(ws: ExtendedWebSocket): ConnectionMetadata | null {
    for (const metadata of this.connections.values()) {
      if (metadata.ws === ws) {
        return metadata;
      }
    }
    return null;
  }

  /**
   * Get all connections for a specific user (supports multi-tab)
   */
  public getUserConnections(userId: string): ExtendedWebSocket[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    const connections: ExtendedWebSocket[] = [];
    for (const id of connectionIds) {
      const metadata = this.connections.get(id);
      if (metadata) {
        connections.push(metadata.ws);
      }
    }

    return connections;
  }

  /**
   * Get all connections for a specific conversation
   */
  public getConversationConnections(
    conversationId: string
  ): ExtendedWebSocket[] {
    const connectionIds = this.conversationConnections.get(conversationId);
    if (!connectionIds) {
      return [];
    }

    const connections: ExtendedWebSocket[] = [];
    for (const id of connectionIds) {
      const metadata = this.connections.get(id);
      if (metadata) {
        connections.push(metadata.ws);
      }
    }

    return connections;
  }

  /**
   * Subscribe a connection to a conversation
   */
  public joinConversation(
    ws: ExtendedWebSocket,
    conversationId: string
  ): boolean {
    const metadata = this.getConnection(ws);
    if (!metadata) {
      console.warn('Cannot join conversation: connection not found');
      return false;
    }

    // Find connection ID
    let connectionId: string | null = null;
    for (const [id, meta] of this.connections.entries()) {
      if (meta.ws === ws) {
        connectionId = id;
        break;
      }
    }

    if (!connectionId) {
      return false;
    }

    // Remove from old conversation if exists
    if (metadata.conversationId) {
      const oldConvConns = this.conversationConnections.get(
        metadata.conversationId
      );
      if (oldConvConns) {
        oldConvConns.delete(connectionId);
        if (oldConvConns.size === 0) {
          this.conversationConnections.delete(metadata.conversationId);
        }
      }
    }

    // Update metadata
    metadata.conversationId = conversationId;
    ws.conversationId = conversationId;

    // Add to new conversation
    if (!this.conversationConnections.has(conversationId)) {
      this.conversationConnections.set(conversationId, new Set());
    }
    this.conversationConnections.get(conversationId)!.add(connectionId);

    console.log(
      `Connection ${connectionId} joined conversation: ${conversationId}`
    );

    return true;
  }

  /**
   * Unsubscribe a connection from its current conversation
   */
  public leaveConversation(ws: ExtendedWebSocket): boolean {
    const metadata = this.getConnection(ws);
    if (!metadata || !metadata.conversationId) {
      return false;
    }

    // Find connection ID
    let connectionId: string | null = null;
    for (const [id, meta] of this.connections.entries()) {
      if (meta.ws === ws) {
        connectionId = id;
        break;
      }
    }

    if (!connectionId) {
      return false;
    }

    const conversationId = metadata.conversationId;

    // Remove from conversation
    const convConns = this.conversationConnections.get(conversationId);
    if (convConns) {
      convConns.delete(connectionId);
      if (convConns.size === 0) {
        this.conversationConnections.delete(conversationId);
      }
    }

    // Clear metadata
    metadata.conversationId = undefined;
    ws.conversationId = undefined;

    console.log(
      `Connection ${connectionId} left conversation: ${conversationId}`
    );

    return true;
  }

  /**
   * Get total number of active connections
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get total number of unique users connected
   */
  public getUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get statistics about connections
   */
  public getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    activeConversations: number;
  } {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      activeConversations: this.conversationConnections.size,
    };
  }

  /**
   * Check if a user has any active connections
   */
  public isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId) &&
           this.userConnections.get(userId)!.size > 0;
  }

  /**
   * Clear all connections (used during shutdown)
   */
  public clear(): void {
    this.connections.clear();
    this.userConnections.clear();
    this.conversationConnections.clear();
    console.log('All connections cleared from manager');
  }
}
