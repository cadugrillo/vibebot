/**
 * Claude Streaming Handler
 * VBT-157: Implement Streaming Response Handler
 *
 * Handles Claude API streaming responses with event callbacks
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  StreamCallback,
  StreamEvent,
  ClaudeResponse,
  TokenUsage,
  CostInfo,
  ClaudeServiceError,
  ClaudeErrorType,
} from './types';
import { calculateCost, getModelConfig } from './models';

/**
 * Stream handler class
 * Manages Claude API streaming with event emissions
 */
export class StreamHandler {
  private contentBuffer: string = '';
  private inputTokens: number = 0;
  private outputTokens: number = 0;
  private stopReason: string = '';
  private model: string = '';
  private streamStarted: boolean = false;
  private streamCompleted: boolean = false;
  private lastEventTime: number = Date.now();

  constructor(private readonly messageId: string, private readonly callback: StreamCallback) {}

  /**
   * Handle message_start event
   */
  handleMessageStart(event: Anthropic.MessageStartEvent): void {
    console.log(`Stream started for message: ${this.messageId}`);
    this.model = event.message.model;
    this.inputTokens = event.message.usage.input_tokens;
    this.streamStarted = true;
    this.lastEventTime = Date.now();

    // Emit start event
    this.callback({
      type: 'start',
      messageId: this.messageId,
    });
  }

  /**
   * Handle content_block_start event
   */
  handleContentBlockStart(event: Anthropic.ContentBlockStartEvent): void {
    console.log(`Content block started: ${event.content_block.type}`);
  }

  /**
   * Handle content_block_delta event (text chunks)
   */
  handleContentBlockDelta(event: Anthropic.ContentBlockDeltaEvent): void {
    if (event.delta.type === 'text_delta') {
      const chunk = event.delta.text;
      this.contentBuffer += chunk;
      this.lastEventTime = Date.now();

      // Emit delta event with chunk
      this.callback({
        type: 'delta',
        content: chunk,
        messageId: this.messageId,
        isComplete: false,
      });
    }
  }

  /**
   * Handle content_block_stop event
   */
  handleContentBlockStop(_event: Anthropic.ContentBlockStopEvent): void {
    console.log('Content block stopped');
  }

  /**
   * Handle message_delta event (final token counts)
   */
  handleMessageDelta(event: Anthropic.MessageDeltaEvent): void {
    if (event.delta.stop_reason) {
      this.stopReason = event.delta.stop_reason;
    }
    if (event.usage) {
      this.outputTokens = event.usage.output_tokens;
    }
    console.log(`Message delta - Stop reason: ${this.stopReason}, Output tokens: ${this.outputTokens}`);
  }

  /**
   * Handle message_stop event (stream complete)
   */
  handleMessageStop(): void {
    console.log(`Stream completed for message: ${this.messageId}`);
    console.log(`Total content length: ${this.contentBuffer.length} characters`);
    console.log(`Token usage: ${this.inputTokens} input, ${this.outputTokens} output`);

    this.streamCompleted = true;
    this.lastEventTime = Date.now();

    // Emit complete event
    this.callback({
      type: 'complete',
      content: this.contentBuffer,
      messageId: this.messageId,
      isComplete: true,
    });
  }

  /**
   * Handle stream error
   */
  handleError(error: Error): void {
    console.error(`Stream error for message ${this.messageId}:`, error);

    // Emit error event
    this.callback({
      type: 'error',
      error: error.message,
      messageId: this.messageId,
    });
  }

  /**
   * Get final response data
   */
  getResponse(): ClaudeResponse {
    const tokenUsage: TokenUsage = {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
    };

    // Calculate cost
    const calculatedCost = calculateCost(
      this.model,
      this.inputTokens,
      this.outputTokens
    );

    const cost: CostInfo = {
      inputCost: calculatedCost ? (this.inputTokens / 1_000_000) * (getModelConfig(this.model)?.pricing.input || 0) : 0,
      outputCost: calculatedCost ? (this.outputTokens / 1_000_000) * (getModelConfig(this.model)?.pricing.output || 0) : 0,
      totalCost: calculatedCost || 0,
      currency: 'USD',
    };

    return {
      content: this.contentBuffer,
      messageId: this.messageId,
      tokenUsage,
      cost,
      model: this.model,
      stopReason: this.stopReason,
    };
  }

  /**
   * Get accumulated content
   */
  getContent(): string {
    return this.contentBuffer;
  }

  /**
   * Get token usage
   */
  getTokenUsage(): TokenUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
    };
  }

  /**
   * Check if stream was interrupted
   * VBT-160: Stream interruption detection
   */
  isStreamInterrupted(): boolean {
    return this.streamStarted && !this.streamCompleted;
  }

  /**
   * Get stream status information
   * VBT-160: Stream status for debugging
   */
  getStreamStatus(): {
    started: boolean;
    completed: boolean;
    interrupted: boolean;
    contentLength: number;
    lastEventTime: Date;
  } {
    return {
      started: this.streamStarted,
      completed: this.streamCompleted,
      interrupted: this.isStreamInterrupted(),
      contentLength: this.contentBuffer.length,
      lastEventTime: new Date(this.lastEventTime),
    };
  }
}

/**
 * Process Claude API stream
 * Main function to handle streaming from Claude API
 */
export async function processStream(
  stream: any,
  messageId: string,
  callback: StreamCallback
): Promise<ClaudeResponse> {
  const handler = new StreamHandler(messageId, callback);

  try {
    for await (const event of stream) {
      switch (event.type) {
        case 'message_start':
          handler.handleMessageStart(event);
          break;

        case 'content_block_start':
          handler.handleContentBlockStart(event);
          break;

        case 'content_block_delta':
          handler.handleContentBlockDelta(event);
          break;

        case 'content_block_stop':
          handler.handleContentBlockStop(event);
          break;

        case 'message_delta':
          handler.handleMessageDelta(event);
          break;

        case 'message_stop':
          handler.handleMessageStop();
          break;

        default:
          console.warn('Unknown stream event type:', (event as any).type);
      }
    }

    // VBT-160: Check if stream was interrupted
    if (handler.isStreamInterrupted()) {
      const status = handler.getStreamStatus();
      console.warn('⚠️ Stream was interrupted before completion');
      console.warn(`   Stream status:`, status);
      console.warn(`   Partial content length: ${status.contentLength} characters`);

      handler.handleError(new Error('Stream interrupted before completion'));

      throw new ClaudeServiceError(
        ClaudeErrorType.STREAM_INTERRUPTED,
        `Stream was interrupted. Received ${status.contentLength} characters before interruption.`,
        undefined,
        true, // Retryable
        undefined,
        undefined,
        {
          messageId,
          partialContent: handler.getContent(),
          contentLength: status.contentLength,
          streamStatus: status,
        }
      );
    }

    return handler.getResponse();
  } catch (error) {
    // VBT-160: Enhanced error handling with categorization
    const streamStatus = handler.getStreamStatus();

    handler.handleError(error instanceof Error ? error : new Error('Stream processing error'));

    // Check if it's already a ClaudeServiceError
    if (error instanceof ClaudeServiceError) {
      throw error;
    }

    // Categorize error type based on error message
    let errorType = ClaudeErrorType.INTERNAL;
    let retryable = true;

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('network') || message.includes('connection')) {
        errorType = ClaudeErrorType.NETWORK;
      } else if (message.includes('timeout')) {
        errorType = ClaudeErrorType.TIMEOUT;
      } else if (message.includes('interrupted') || message.includes('aborted')) {
        errorType = ClaudeErrorType.STREAM_INTERRUPTED;
      }
    }

    throw new ClaudeServiceError(
      errorType,
      `Stream processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      retryable,
      undefined,
      undefined,
      {
        messageId,
        partialContent: handler.getContent(),
        streamStatus,
      }
    );
  }
}

/**
 * Create a simple text callback for testing
 */
export function createTextCallback(): {
  callback: StreamCallback;
  getContent: () => string;
} {
  let content = '';

  const callback: StreamCallback = (event: StreamEvent) => {
    if (event.type === 'delta' && event.content) {
      content += event.content;
      process.stdout.write(event.content); // Print to console in real-time
    } else if (event.type === 'complete') {
      process.stdout.write('\n');
      console.log(`\n✅ Stream completed! Total length: ${content.length} characters`);
    } else if (event.type === 'error') {
      console.error(`\n❌ Stream error: ${event.error}`);
    }
  };

  return {
    callback,
    getContent: () => content,
  };
}
