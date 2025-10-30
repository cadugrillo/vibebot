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

  constructor(private readonly messageId: string, private readonly callback: StreamCallback) {}

  /**
   * Handle message_start event
   */
  handleMessageStart(event: Anthropic.MessageStartEvent): void {
    console.log(`Stream started for message: ${this.messageId}`);
    this.model = event.message.model;
    this.inputTokens = event.message.usage.input_tokens;

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
  handleContentBlockStop(event: Anthropic.ContentBlockStopEvent): void {
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
}

/**
 * Process Claude API stream
 * Main function to handle streaming from Claude API
 */
export async function processStream(
  stream: Anthropic.Stream<Anthropic.MessageStreamEvent>,
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

    return handler.getResponse();
  } catch (error) {
    handler.handleError(error instanceof Error ? error : new Error('Stream processing error'));

    throw new ClaudeServiceError(
      ClaudeErrorType.INTERNAL,
      `Stream processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      true
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
