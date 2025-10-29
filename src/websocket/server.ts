/**
 * WebSocket Server for Real-time Communication
 * Handles real-time message streaming, typing indicators, and connection management
 */

import { Server as WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HTTPServer } from 'http';
import { parse } from 'url';
import { verifyAccessToken } from '../utils/auth.utils';
import { ConnectionManager } from './connectionManager';

/**
 * WebSocket server configuration
 */
interface WebSocketServerConfig {
  server: HTTPServer;
  path?: string;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

/**
 * Extended WebSocket with custom properties
 */
export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  conversationId?: string;
  connectedAt: Date;
}

/**
 * WebSocket Server class
 * Manages WebSocket connections with heartbeat and timeout
 */
export class VibeWebSocketServer {
  private wss: WebSocketServer;
  private heartbeatInterval: number;
  // @ts-expect-error - Reserved for future use (e.g., idle connection timeout)
  private connectionTimeout: number;
  private heartbeatTimer?: NodeJS.Timeout;
  private connectionManager: ConnectionManager;

  constructor(config: WebSocketServerConfig) {
    const {
      server,
      path = '/ws',
      heartbeatInterval = 30000, // 30 seconds
      connectionTimeout = 60000, // 60 seconds - will be used in VBT-145 for auth timeout
    } = config;

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path,
      // Disable automatic handling of upgrade requests (we'll handle auth manually)
      noServer: false,
    });

    this.heartbeatInterval = heartbeatInterval;
    this.connectionTimeout = connectionTimeout; // Reserved for future use

    // Initialize connection manager
    this.connectionManager = new ConnectionManager();

    this.initialize();
  }

  /**
   * Initialize WebSocket server with event handlers
   */
  private initialize(): void {
    console.log('Initializing WebSocket server...');

    // Setup connection handler
    this.wss.on('connection', this.handleConnection.bind(this));

    // Setup error handler
    this.wss.on('error', this.handleServerError.bind(this));

    // Start heartbeat monitoring
    this.startHeartbeat();

    console.log('WebSocket server initialized successfully');
  }

  /**
   * Handle new WebSocket connection
   * Authenticates the connection using JWT token from query parameters
   */
  private handleConnection(
    ws: WebSocket,
    req: IncomingMessage
  ): void {
    const extWs = ws as ExtendedWebSocket;

    // Initialize connection metadata
    extWs.isAlive = true;
    extWs.connectedAt = new Date();

    console.log('New WebSocket connection attempt from:', req.socket.remoteAddress);

    // Extract and verify authentication token
    const { query } = parse(req.url || '', true);
    const token = Array.isArray(query.token) ? query.token[0] : query.token;

    if (!token) {
      console.warn('WebSocket connection rejected: No authentication token provided');
      this.sendToClient(extWs, {
        type: 'connection:error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      extWs.close(1008, 'Authentication required'); // 1008 = Policy Violation
      return;
    }

    // Verify JWT token
    try {
      const payload = verifyAccessToken(token);

      // Attach user information to WebSocket
      extWs.userId = payload.userId;

      console.log(`WebSocket authenticated for user: ${payload.email} (${payload.userId})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.warn('WebSocket authentication failed:', errorMessage);

      this.sendToClient(extWs, {
        type: 'connection:error',
        message: errorMessage,
        code: 'AUTH_FAILED',
      });
      extWs.close(1008, 'Authentication failed'); // 1008 = Policy Violation
      return;
    }

    // Setup connection event handlers
    this.setupConnectionHandlers(extWs);

    // Add connection to manager
    const connectionId = this.connectionManager.addConnection(extWs);

    // Send connection established event
    this.sendToClient(extWs, {
      type: 'connection:established',
      timestamp: new Date().toISOString(),
      userId: extWs.userId,
      connectionId,
    });

    console.log('WebSocket connection established and authenticated');
  }

  /**
   * Setup event handlers for a WebSocket connection
   */
  private setupConnectionHandlers(ws: ExtendedWebSocket): void {
    // Heartbeat/pong handler
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Message handler (will be expanded in VBT-147)
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Close handler (will be expanded in VBT-151)
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnect(ws, code, reason.toString());
    });

    // Error handler
    ws.on('error', (error: Error) => {
      this.handleConnectionError(ws, error);
    });
  }

  /**
   * Handle incoming WebSocket message
   * Basic implementation - will be expanded in VBT-147
   */
  private handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message.type);

      // Echo back for now (will implement proper handlers in VBT-147)
      this.sendToClient(ws, {
        type: 'message:received',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error parsing message:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  /**
   * Handle WebSocket disconnection
   * Basic implementation - will be expanded in VBT-151
   */
  private handleDisconnect(
    ws: ExtendedWebSocket,
    code: number,
    reason: string
  ): void {
    console.log(`WebSocket disconnected - Code: ${code}, Reason: ${reason || 'No reason'}`);
    console.log(`Connection duration: ${Date.now() - ws.connectedAt.getTime()}ms`);

    // Remove connection from manager
    this.connectionManager.removeConnection(ws);
  }

  /**
   * Handle WebSocket connection error
   */
  private handleConnectionError(ws: ExtendedWebSocket, error: Error): void {
    console.error('WebSocket connection error:', error.message);
    this.sendToClient(ws, {
      type: 'connection:error',
      message: error.message,
    });
  }

  /**
   * Handle WebSocket server error
   */
  private handleServerError(error: Error): void {
    console.error('WebSocket server error:', error);
  }

  /**
   * Start heartbeat/ping mechanism
   * Pings all clients at regular intervals to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;

        // Terminate dead connections
        if (extWs.isAlive === false) {
          console.log('Terminating inactive connection');
          return extWs.terminate();
        }

        // Mark as potentially dead and send ping
        extWs.isAlive = false;
        extWs.ping();
      });
    }, this.heartbeatInterval);

    console.log(`Heartbeat started (interval: ${this.heartbeatInterval}ms)`);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      console.log('Heartbeat stopped');
    }
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: ExtendedWebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(data: unknown, excludeWs?: ExtendedWebSocket): void {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Get number of connected clients
   */
  public getClientCount(): number {
    return this.wss.clients.size;
  }

  /**
   * Get all WebSocket connections for a specific user
   */
  public getConnectionsByUserId(userId: string): ExtendedWebSocket[] {
    return this.connectionManager.getUserConnections(userId);
  }

  /**
   * Send message to a specific user (all their connections)
   */
  public sendToUser(userId: string, data: unknown): void {
    const connections = this.connectionManager.getUserConnections(userId);
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Send message to all participants in a conversation
   */
  public sendToConversation(conversationId: string, data: unknown): void {
    const connections = this.connectionManager.getConversationConnections(conversationId);
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Join a conversation (subscribe to conversation updates)
   */
  public joinConversation(ws: ExtendedWebSocket, conversationId: string): boolean {
    return this.connectionManager.joinConversation(ws, conversationId);
  }

  /**
   * Leave a conversation (unsubscribe from conversation updates)
   */
  public leaveConversation(ws: ExtendedWebSocket): boolean {
    return this.connectionManager.leaveConversation(ws);
  }

  /**
   * Get connection manager statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    activeConversations: number;
  } {
    return this.connectionManager.getStats();
  }

  /**
   * Get WebSocket server instance
   */
  public getServer(): WebSocketServer {
    return this.wss;
  }

  /**
   * Shutdown WebSocket server gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');

    // Stop heartbeat
    this.stopHeartbeat();

    // Close all client connections
    this.wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });

    // Clear connection manager
    this.connectionManager.clear();

    // Close the server
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          console.error('Error closing WebSocket server:', err);
          reject(err);
        } else {
          console.log('WebSocket server closed successfully');
          resolve();
        }
      });
    });
  }
}
