/**
 * Unified Streaming Interface for AI Providers
 * VBT-167: Create consistent streaming interface across all providers
 *
 * This module provides a unified streaming abstraction that works across
 * different AI providers (Claude, OpenAI, etc.). It standardizes streaming
 * events, state management, and provides advanced features like pause/resume
 * and back-pressure handling.
 */

import {
  StreamEvent,
  StreamCallback,
  TokenUsage,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './errors';

/**
 * Stream state
 * Tracks the current state of a streaming operation
 */
export enum StreamState {
  /** Stream not yet started */
  IDLE = 'IDLE',

  /** Stream has started and is actively receiving data */
  STREAMING = 'STREAMING',

  /** Stream is paused (buffering events) */
  PAUSED = 'PAUSED',

  /** Stream completed successfully */
  COMPLETED = 'COMPLETED',

  /** Stream was cancelled by user */
  CANCELLED = 'CANCELLED',

  /** Stream encountered an error */
  ERROR = 'ERROR',
}

/**
 * Stream metrics
 * Performance and status metrics for a stream
 */
export interface StreamMetrics {
  /** When stream started */
  startTime?: Date;

  /** When stream ended */
  endTime?: Date;

  /** Total duration in milliseconds */
  duration?: number;

  /** Number of chunks received */
  chunksReceived: number;

  /** Total bytes received */
  bytesReceived: number;

  /** Current streaming rate (bytes/second) */
  streamingRate?: number;

  /** Time since last chunk (milliseconds) */
  timeSinceLastChunk?: number;
}

/**
 * Stream options
 * Configuration for stream behavior
 */
export interface StreamOptions {
  /** Enable automatic pause when buffer is full */
  enableBackPressure?: boolean;

  /** Maximum buffer size (number of events) before pausing */
  maxBufferSize?: number;

  /** Timeout for stream inactivity (milliseconds) */
  inactivityTimeout?: number;

  /** Enable performance metrics collection */
  collectMetrics?: boolean;
}

/**
 * Default stream options
 */
export const DEFAULT_STREAM_OPTIONS: StreamOptions = {
  enableBackPressure: true,
  maxBufferSize: 100,
  inactivityTimeout: 30000, // 30 seconds
  collectMetrics: true,
};

/**
 * Base Stream Handler
 *
 * Abstract base class for streaming handlers across all providers.
 * Provides common functionality for state management, buffering,
 * metrics collection, and event emission.
 *
 * Provider-specific implementations should extend this class and
 * implement the abstract methods.
 */
export abstract class BaseStreamHandler {
  /** Current stream state */
  protected state: StreamState = StreamState.IDLE;

  /** Content buffer (accumulated response) */
  protected contentBuffer: string = '';

  /** Event buffer (for when stream is paused) */
  protected eventBuffer: StreamEvent[] = [];

  /** Token usage tracking */
  protected tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  /** Stream metrics */
  protected metrics: StreamMetrics = {
    chunksReceived: 0,
    bytesReceived: 0,
  };

  /** Last chunk timestamp */
  protected lastChunkTime?: Date;

  /** Inactivity timeout timer */
  protected inactivityTimer?: NodeJS.Timeout;

  /** User callback function */
  protected callback: StreamCallback;

  /** Message ID */
  protected messageId: string;

  /** Stream options */
  protected options: StreamOptions;

  /** Cancellation flag */
  protected cancelled: boolean = false;

  constructor(
    messageId: string,
    callback: StreamCallback,
    options: StreamOptions = DEFAULT_STREAM_OPTIONS
  ) {
    this.messageId = messageId;
    this.callback = callback;
    this.options = { ...DEFAULT_STREAM_OPTIONS, ...options };
  }

  /**
   * Start the stream
   * Should be called when streaming begins
   */
  protected handleStart(): void {
    if (this.state !== StreamState.IDLE) {
      throw new Error(`Cannot start stream in state: ${this.state}`);
    }

    this.state = StreamState.STREAMING;

    if (this.options.collectMetrics) {
      this.metrics.startTime = new Date();
    }

    // Emit start event
    this.emitEvent({
      type: 'start',
      messageId: this.messageId,
    });

    // Start inactivity timer
    this.resetInactivityTimer();
  }

  /**
   * Handle a content chunk
   * @param chunk - Text chunk from provider
   */
  protected handleChunk(chunk: string): void {
    if (this.state === StreamState.CANCELLED) {
      return; // Ignore chunks after cancellation
    }

    if (this.state !== StreamState.STREAMING && this.state !== StreamState.PAUSED) {
      console.warn(`Received chunk in unexpected state: ${this.state}`);
    }

    // Update buffer
    this.contentBuffer += chunk;

    // Update metrics
    if (this.options.collectMetrics) {
      this.metrics.chunksReceived++;
      this.metrics.bytesReceived += chunk.length;
      this.lastChunkTime = new Date();

      // Calculate streaming rate
      if (this.metrics.startTime) {
        const duration = Date.now() - this.metrics.startTime.getTime();
        this.metrics.streamingRate = (this.metrics.bytesReceived / duration) * 1000; // bytes/second
      }
    }

    // Reset inactivity timer
    this.resetInactivityTimer();

    // Emit delta event
    const event: StreamEvent = {
      type: 'delta',
      content: chunk,
      messageId: this.messageId,
      isComplete: false,
    };

    this.emitEvent(event);

    // Check back-pressure
    if (this.options.enableBackPressure && this.options.maxBufferSize) {
      if (this.eventBuffer.length >= this.options.maxBufferSize) {
        console.warn('Stream buffer full, pausing stream');
        this.pause();
      }
    }
  }

  /**
   * Handle stream completion
   */
  protected handleComplete(): void {
    if (this.state === StreamState.CANCELLED) {
      return; // Already handled
    }

    this.state = StreamState.COMPLETED;

    // Clear inactivity timer
    this.clearInactivityTimer();

    // Update metrics
    if (this.options.collectMetrics && this.metrics.startTime) {
      this.metrics.endTime = new Date();
      this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    }

    // Emit complete event
    this.emitEvent({
      type: 'complete',
      content: this.contentBuffer,
      messageId: this.messageId,
      isComplete: true,
    });
  }

  /**
   * Handle stream error
   * @param error - Error that occurred
   */
  protected handleError(error: Error | ProviderError): void {
    if (this.state === StreamState.CANCELLED) {
      return; // Already handled
    }

    this.state = StreamState.ERROR;

    // Clear inactivity timer
    this.clearInactivityTimer();

    // Update metrics
    if (this.options.collectMetrics && !this.metrics.endTime) {
      this.metrics.endTime = new Date();
      if (this.metrics.startTime) {
        this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
      }
    }

    // Emit error event
    this.emitEvent({
      type: 'error',
      error: error.message,
      messageId: this.messageId,
    });
  }

  /**
   * Emit an event to the callback
   * Handles buffering when stream is paused
   */
  protected emitEvent(event: StreamEvent): void {
    if (this.state === StreamState.PAUSED) {
      // Buffer events when paused
      this.eventBuffer.push(event);
    } else {
      // Emit immediately
      try {
        this.callback(event);
      } catch (error) {
        console.error('Error in stream callback:', error);
        // Don't let callback errors stop the stream
      }
    }
  }

  /**
   * Pause the stream
   * Events will be buffered until resume() is called
   */
  public pause(): void {
    if (this.state !== StreamState.STREAMING) {
      console.warn(`Cannot pause stream in state: ${this.state}`);
      return;
    }

    this.state = StreamState.PAUSED;
    console.log(`Stream paused (buffer size: ${this.eventBuffer.length})`);
  }

  /**
   * Resume the stream
   * Flushes buffered events and continues streaming
   */
  public resume(): void {
    if (this.state !== StreamState.PAUSED) {
      console.warn(`Cannot resume stream in state: ${this.state}`);
      return;
    }

    this.state = StreamState.STREAMING;

    // Flush buffered events
    const bufferedEvents = [...this.eventBuffer];
    this.eventBuffer = [];

    console.log(`Stream resumed, flushing ${bufferedEvents.length} buffered events`);

    for (const event of bufferedEvents) {
      try {
        this.callback(event);
      } catch (error) {
        console.error('Error flushing buffered event:', error);
      }
    }
  }

  /**
   * Cancel the stream
   * Stops streaming and cleans up resources
   */
  public cancel(): void {
    if (this.state === StreamState.COMPLETED || this.state === StreamState.CANCELLED) {
      console.warn(`Stream already in terminal state: ${this.state}`);
      return;
    }

    this.cancelled = true;
    this.state = StreamState.CANCELLED;

    // Clear inactivity timer
    this.clearInactivityTimer();

    // Clear buffers
    this.eventBuffer = [];

    // Update metrics
    if (this.options.collectMetrics && !this.metrics.endTime) {
      this.metrics.endTime = new Date();
      if (this.metrics.startTime) {
        this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
      }
    }

    console.log('Stream cancelled');

    // Emit error event for cancellation
    this.emitEvent({
      type: 'error',
      error: 'Stream cancelled by user',
      messageId: this.messageId,
    });
  }

  /**
   * Reset inactivity timer
   */
  protected resetInactivityTimer(): void {
    this.clearInactivityTimer();

    if (this.options.inactivityTimeout) {
      this.inactivityTimer = setTimeout(() => {
        console.warn('Stream inactivity timeout reached');
        this.handleError(
          new ProviderError(
            ProviderErrorType.TIMEOUT,
            'Stream inactivity timeout',
            { retryable: true }
          )
        );
      }, this.options.inactivityTimeout);
    }
  }

  /**
   * Clear inactivity timer
   */
  protected clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  /**
   * Get current stream state
   */
  public getState(): StreamState {
    return this.state;
  }

  /**
   * Get accumulated content
   */
  public getContent(): string {
    return this.contentBuffer;
  }

  /**
   * Get token usage
   */
  public getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Get stream metrics
   */
  public getMetrics(): StreamMetrics {
    const metrics = { ...this.metrics };

    // Calculate time since last chunk
    if (this.lastChunkTime && this.state === StreamState.STREAMING) {
      metrics.timeSinceLastChunk = Date.now() - this.lastChunkTime.getTime();
    }

    return metrics;
  }

  /**
   * Get buffered event count
   */
  public getBufferedEventCount(): number {
    return this.eventBuffer.length;
  }

  /**
   * Check if stream was interrupted
   * Stream is interrupted if started but not completed/cancelled/errored properly
   */
  public isInterrupted(): boolean {
    return (
      this.state === StreamState.STREAMING ||
      this.state === StreamState.PAUSED
    );
  }

  /**
   * Get final response
   * Should be called after stream completes
   * Must be implemented by provider-specific handlers
   */
  public abstract getResponse(): AIResponse;

  /**
   * Clean up resources
   * Should be called when stream handler is no longer needed
   */
  public destroy(): void {
    this.clearInactivityTimer();
    this.eventBuffer = [];
  }
}

/**
 * Stream buffer
 * Utility class for managing buffered events with back-pressure
 */
export class StreamBuffer {
  private buffer: StreamEvent[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Add event to buffer
   * @returns true if added, false if buffer is full
   */
  public add(event: StreamEvent): boolean {
    if (this.buffer.length >= this.maxSize) {
      return false; // Buffer full
    }

    this.buffer.push(event);
    return true;
  }

  /**
   * Flush all buffered events
   */
  public flush(): StreamEvent[] {
    const events = [...this.buffer];
    this.buffer = [];
    return events;
  }

  /**
   * Get buffer size
   */
  public size(): number {
    return this.buffer.length;
  }

  /**
   * Check if buffer is full
   */
  public isFull(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  /**
   * Check if buffer is empty
   */
  public isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * Clear buffer
   */
  public clear(): void {
    this.buffer = [];
  }
}

/**
 * Stream rate limiter
 * Controls the rate at which events are emitted (for back-pressure)
 */
export class StreamRateLimiter {
  private lastEmitTime: number = 0;
  private minInterval: number;

  constructor(eventsPerSecond: number = 100) {
    this.minInterval = 1000 / eventsPerSecond;
  }

  /**
   * Check if we can emit now
   * @returns true if enough time has passed since last emit
   */
  public canEmit(): boolean {
    const now = Date.now();
    return now - this.lastEmitTime >= this.minInterval;
  }

  /**
   * Wait until we can emit
   * @returns Promise that resolves when ready to emit
   */
  public async waitForEmit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;

    if (timeSinceLastEmit >= this.minInterval) {
      this.lastEmitTime = now;
      return;
    }

    const waitTime = this.minInterval - timeSinceLastEmit;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.lastEmitTime = Date.now();
  }

  /**
   * Mark an emit occurred
   */
  public markEmit(): void {
    this.lastEmitTime = Date.now();
  }
}

/**
 * Create a debounced callback
 * Useful for throttling rapid stream events
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceCallback(
  callback: StreamCallback,
  delay: number
): StreamCallback {
  let timeoutId: NodeJS.Timeout | undefined;
  let lastEvent: StreamEvent | undefined;

  return (event: StreamEvent) => {
    lastEvent = event;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastEvent) {
        callback(lastEvent);
        lastEvent = undefined;
      }
    }, delay);
  };
}

/**
 * Create a batched callback
 * Batches multiple delta events into single callbacks
 *
 * @param callback - Function to call with batched content
 * @param batchSize - Number of events to batch
 * @returns Batched callback function
 */
export function batchCallback(
  callback: StreamCallback,
  batchSize: number = 10
): StreamCallback {
  let batch: string[] = [];
  let eventCount = 0;

  return (event: StreamEvent) => {
    // Pass through non-delta events immediately
    if (event.type !== 'delta') {
      // Flush any pending batch first
      if (batch.length > 0) {
        callback({
          type: 'delta',
          content: batch.join(''),
          messageId: event.messageId,
          isComplete: false,
        });
        batch = [];
        eventCount = 0;
      }

      callback(event);
      return;
    }

    // Batch delta events
    if (event.content) {
      batch.push(event.content);
      eventCount++;
    }

    // Flush when batch is full
    if (eventCount >= batchSize) {
      callback({
        type: 'delta',
        content: batch.join(''),
        messageId: event.messageId,
        isComplete: false,
      });
      batch = [];
      eventCount = 0;
    }
  };
}
