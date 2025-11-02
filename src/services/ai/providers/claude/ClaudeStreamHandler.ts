/**
 * Claude Stream Handler
 * VBT-168: Extends BaseStreamHandler for Claude-specific streaming
 *
 * Handles Claude API streaming events and converts them to unified format.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseStreamHandler, StreamOptions, DEFAULT_STREAM_OPTIONS } from '../streaming';
import { AIResponse, ProviderType, StreamCallback } from '../types';
import { calculateCostFromUsage } from '../types';
import { getClaudeModelConfig } from './models';

/**
 * Claude Stream Handler
 * Processes Claude API streaming responses
 */
export class ClaudeStreamHandler extends BaseStreamHandler {
  private model: string = '';
  private stopReason: string = '';

  constructor(
    messageId: string,
    callback: StreamCallback,
    options: StreamOptions = DEFAULT_STREAM_OPTIONS
  ) {
    super(messageId, callback, options);
  }

  /**
   * Handle message_start event from Claude API
   */
  public handleMessageStart(event: Anthropic.MessageStartEvent): void {
    this.model = event.message.model;
    this.tokenUsage.inputTokens = event.message.usage.input_tokens;

    // Call base class start handler
    this.handleStart();
  }

  /**
   * Handle content_block_start event from Claude API
   */
  public handleContentBlockStart(event: Anthropic.ContentBlockStartEvent): void {
    console.log(`Content block started: ${event.content_block.type}`);
  }

  /**
   * Handle content_block_delta event from Claude API
   */
  public handleContentBlockDelta(event: Anthropic.ContentBlockDeltaEvent): void {
    if (event.delta.type === 'text_delta') {
      const chunk = event.delta.text;
      // Call base class chunk handler
      this.handleChunk(chunk);
    }
  }

  /**
   * Handle content_block_stop event from Claude API
   */
  public handleContentBlockStop(_event: Anthropic.ContentBlockStopEvent): void {
    console.log('Content block stopped');
  }

  /**
   * Handle message_delta event from Claude API
   */
  public handleMessageDelta(event: Anthropic.MessageDeltaEvent): void {
    if (event.delta.stop_reason) {
      this.stopReason = event.delta.stop_reason;
    }
    if (event.usage) {
      this.tokenUsage.outputTokens = event.usage.output_tokens;
      this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;
    }
  }

  /**
   * Handle message_stop event from Claude API
   */
  public handleMessageStop(): void {
    // Call base class complete handler
    this.handleComplete();
  }

  /**
   * Process Claude API stream
   * Main entry point for streaming
   */
  public async processStream(stream: any): Promise<AIResponse> {
    try {
      for await (const event of stream) {
        // Check if cancelled
        if (this.cancelled) {
          console.log('Stream cancelled, stopping iteration');
          break;
        }

        switch (event.type) {
          case 'message_start':
            this.handleMessageStart(event);
            break;

          case 'content_block_start':
            this.handleContentBlockStart(event);
            break;

          case 'content_block_delta':
            this.handleContentBlockDelta(event);
            break;

          case 'content_block_stop':
            this.handleContentBlockStop(event);
            break;

          case 'message_delta':
            this.handleMessageDelta(event);
            break;

          case 'message_stop':
            this.handleMessageStop();
            break;

          default:
            console.warn('Unknown Claude stream event type:', (event as any).type);
        }
      }

      // Check if stream was interrupted
      if (this.isInterrupted()) {
        throw new Error('Stream was interrupted before completion');
      }

      return this.getResponse();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Stream processing error'));
      throw error;
    }
  }

  /**
   * Get final response
   * Required by BaseStreamHandler abstract class
   */
  public getResponse(): AIResponse {
    const modelConfig = getClaudeModelConfig(this.model);

    // Calculate cost
    const cost = calculateCostFromUsage(
      this.tokenUsage,
      modelConfig?.pricing || { input: 0, output: 0 }
    );

    return {
      content: this.getContent(),
      messageId: this.messageId,
      tokenUsage: this.tokenUsage,
      cost,
      model: this.model,
      stopReason: this.stopReason,
      finishReason: this.stopReason,
      provider: ProviderType.CLAUDE,
      metadata: {
        modelFamily: (modelConfig?.metadata as any)?.family,
        modelTier: modelConfig?.tier,
      },
    };
  }
}
