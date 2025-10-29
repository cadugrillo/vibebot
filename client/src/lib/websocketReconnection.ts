/**
 * WebSocket Reconnection Utility
 * Implements exponential backoff reconnection strategy with max retries
 */

/**
 * Reconnection configuration
 */
export interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

/**
 * Reconnection state
 */
export interface ReconnectionState {
  attemptNumber: number;
  isReconnecting: boolean;
  lastAttemptTime: number | null;
  nextRetryDelay: number | null;
}

/**
 * Default reconnection configuration
 */
const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterEnabled: true,
};

/**
 * Reconnection Manager class
 */
export class ReconnectionManager {
  private config: ReconnectionConfig;
  private state: ReconnectionState;
  private reconnectTimer: number | null = null;

  constructor(config?: Partial<ReconnectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      attemptNumber: 0,
      isReconnecting: false,
      lastAttemptTime: null,
      nextRetryDelay: null,
    };
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  private calculateDelay(attemptNumber: number): number {
    const { baseDelay, maxDelay, backoffMultiplier, jitterEnabled } = this.config;

    // Exponential backoff: delay = baseDelay * (backoffMultiplier ^ attemptNumber)
    let delay = baseDelay * Math.pow(backoffMultiplier, attemptNumber);

    // Cap at max delay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd (0-20% of delay)
    if (jitterEnabled) {
      const jitter = Math.random() * delay * 0.2;
      delay += jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Check if should retry based on max retries
   */
  public canRetry(): boolean {
    return this.state.attemptNumber < this.config.maxRetries;
  }

  /**
   * Schedule reconnection attempt
   */
  public scheduleReconnect(
    reconnectCallback: () => void,
    onMaxRetriesReached?: () => void
  ): void {
    // Clear any existing timer
    this.cancelReconnect();

    // Check if we can retry
    if (!this.canRetry()) {
      console.warn('Max reconnection attempts reached');
      this.state.isReconnecting = false;
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }

    // Calculate delay
    const delay = this.calculateDelay(this.state.attemptNumber);

    this.state.isReconnecting = true;
    this.state.nextRetryDelay = delay;
    this.state.attemptNumber += 1;
    this.state.lastAttemptTime = Date.now();

    console.log(
      `Scheduling reconnection attempt ${this.state.attemptNumber}/${this.config.maxRetries} in ${delay}ms`
    );

    // Schedule reconnection
    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Attempting reconnection (attempt ${this.state.attemptNumber})`);
      reconnectCallback();
    }, delay);
  }

  /**
   * Cancel scheduled reconnection
   */
  public cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Reset reconnection state (call on successful connection)
   */
  public reset(): void {
    this.cancelReconnect();
    this.state = {
      attemptNumber: 0,
      isReconnecting: false,
      lastAttemptTime: null,
      nextRetryDelay: null,
    };
    console.log('Reconnection state reset - connection successful');
  }

  /**
   * Mark reconnection as failed (increments attempt counter)
   */
  public markAttemptFailed(): void {
    console.log(`Reconnection attempt ${this.state.attemptNumber} failed`);
  }

  /**
   * Get current reconnection state
   */
  public getState(): Readonly<ReconnectionState> {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<ReconnectionConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate estimated time until next retry
   */
  public getTimeUntilNextRetry(): number | null {
    if (!this.state.lastAttemptTime || !this.state.nextRetryDelay) {
      return null;
    }

    const elapsed = Date.now() - this.state.lastAttemptTime;
    const remaining = this.state.nextRetryDelay - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * Get reconnection progress (0-1)
   */
  public getProgress(): number {
    return this.state.attemptNumber / this.config.maxRetries;
  }

  /**
   * Check if currently reconnecting
   */
  public isReconnecting(): boolean {
    return this.state.isReconnecting;
  }
}

/**
 * Message Queue for storing messages during reconnection
 */
export class MessageQueue {
  private queue: Array<{ type: string; data: unknown; timestamp: number }> = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Add message to queue
   */
  public enqueue(type: string, data: unknown): void {
    // Remove oldest message if queue is full
    if (this.queue.length >= this.maxSize) {
      const removed = this.queue.shift();
      console.warn('Message queue full, dropping oldest message:', removed?.type);
    }

    this.queue.push({
      type,
      data,
      timestamp: Date.now(),
    });

    console.log(`Message queued (type: ${type}), queue size: ${this.queue.length}`);
  }

  /**
   * Get all messages and clear queue
   */
  public dequeueAll(): Array<{ type: string; data: unknown; timestamp: number }> {
    const messages = [...this.queue];
    this.queue = [];
    console.log(`Dequeued ${messages.length} messages`);
    return messages;
  }

  /**
   * Clear all messages
   */
  public clear(): void {
    const count = this.queue.length;
    this.queue = [];
    console.log(`Cleared ${count} queued messages`);
  }

  /**
   * Get queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get messages without removing them
   */
  public peek(): Array<{ type: string; data: unknown; timestamp: number }> {
    return [...this.queue];
  }

  /**
   * Remove messages older than specified time (milliseconds)
   */
  public pruneOldMessages(maxAge: number): number {
    const now = Date.now();
    const originalSize = this.queue.length;

    this.queue = this.queue.filter((msg) => now - msg.timestamp < maxAge);

    const pruned = originalSize - this.queue.length;
    if (pruned > 0) {
      console.log(`Pruned ${pruned} old messages from queue`);
    }

    return pruned;
  }
}
