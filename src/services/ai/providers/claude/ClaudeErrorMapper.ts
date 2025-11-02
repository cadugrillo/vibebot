/**
 * Claude Error Mapper
 * VBT-168: Maps Claude/Anthropic errors to unified ProviderError
 *
 * Converts Anthropic SDK errors to standardized ProviderError format.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ProviderError,
  ProviderErrorType,
  ErrorMapper,
  ErrorContext,
  wrapError,
} from '../errors';
import { ProviderType, RateLimitInfo } from '../types';

/**
 * Claude Error Mapper
 * Implements ErrorMapper interface for Claude/Anthropic errors
 */
export class ClaudeErrorMapper implements ErrorMapper {
  /**
   * Map Anthropic API error to ProviderError
   */
  public mapError(error: any, context?: ErrorContext): ProviderError {
    // If already a ProviderError, return as-is
    if (error instanceof ProviderError) {
      return error;
    }

    // Add Claude provider to context
    const enrichedContext: ErrorContext = {
      ...context,
      provider: ProviderType.CLAUDE,
    };

    // Map Anthropic SDK errors
    if (error instanceof Anthropic.AuthenticationError) {
      return new ProviderError(
        ProviderErrorType.AUTHENTICATION,
        'Invalid API key or authentication failed',
        {
          statusCode: error.status || 401,
          retryable: false,
          context: enrichedContext,
          originalError: error,
        }
      );
    }

    if (error instanceof Anthropic.RateLimitError) {
      // RateLimitError extends APIError, cast to access headers
      const rateLimitInfo = this.parseRateLimitInfo(error as InstanceType<typeof Anthropic.APIError>);

      return new ProviderError(
        ProviderErrorType.RATE_LIMIT,
        this.formatRateLimitMessage(rateLimitInfo),
        {
          statusCode: error.status || 429,
          retryable: true,
          rateLimitInfo,
          context: enrichedContext,
          originalError: error,
        }
      );
    }

    if (error instanceof Anthropic.APIError) {
      const errorType = this.categorizeAPIError(error);
      const isRetryable = error.status ? error.status >= 500 : false;

      // Add request ID if available
      if (error.headers?.['x-request-id']) {
        enrichedContext.requestId = error.headers['x-request-id'];
      }

      return new ProviderError(
        errorType,
        error.message || 'Claude API error occurred',
        {
          statusCode: error.status,
          retryable: isRetryable,
          context: enrichedContext,
          originalError: error,
        }
      );
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ProviderError(
        ProviderErrorType.NETWORK,
        'Network connection failed',
        {
          retryable: true,
          context: enrichedContext,
          originalError: error,
        }
      );
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new ProviderError(
        ProviderErrorType.TIMEOUT,
        'Request timed out',
        {
          retryable: true,
          context: enrichedContext,
          originalError: error,
        }
      );
    }

    // Wrap unknown errors
    return wrapError(error, enrichedContext);
  }

  /**
   * Categorize Anthropic API error by status code
   */
  private categorizeAPIError(error: InstanceType<typeof Anthropic.APIError>): ProviderErrorType {
    const status = error.status;

    if (!status) {
      return ProviderErrorType.UNKNOWN;
    }

    // 4xx client errors
    if (status >= 400 && status < 500) {
      switch (status) {
        case 401:
        case 403:
          return ProviderErrorType.AUTHENTICATION;
        case 429:
          return ProviderErrorType.RATE_LIMIT;
        case 402:
          return ProviderErrorType.BILLING;
        case 400:
          // Check error message for more specific categorization
          if (error.message?.includes('context')) {
            return ProviderErrorType.CONTEXT_LENGTH_EXCEEDED;
          }
          if (error.message?.includes('model')) {
            return ProviderErrorType.MODEL_NOT_FOUND;
          }
          return ProviderErrorType.INVALID_REQUEST;
        case 413:
          return ProviderErrorType.CONTEXT_LENGTH_EXCEEDED;
        default:
          return ProviderErrorType.INVALID_REQUEST;
      }
    }

    // 5xx server errors
    if (status >= 500 && status < 600) {
      switch (status) {
        case 503:
          return ProviderErrorType.OVERLOADED;
        case 504:
          return ProviderErrorType.TIMEOUT;
        default:
          return ProviderErrorType.INTERNAL;
      }
    }

    return ProviderErrorType.UNKNOWN;
  }

  /**
   * Parse rate limit information from error
   */
  private parseRateLimitInfo(error: InstanceType<typeof Anthropic.APIError>): RateLimitInfo {
    const rateLimitInfo: RateLimitInfo = {
      isRateLimited: true,
    };

    // Try to extract rate limit headers
    if (error.headers) {
      // Retry-After header (seconds until retry allowed)
      const retryAfter = error.headers.get('retry-after');
      if (retryAfter) {
        rateLimitInfo.retryAfter = parseInt(retryAfter, 10);
      }

      // X-RateLimit-* headers
      const limit = error.headers.get('x-ratelimit-limit');
      const remaining = error.headers.get('x-ratelimit-remaining');
      const reset = error.headers.get('x-ratelimit-reset');

      if (limit) {
        rateLimitInfo.limit = parseInt(limit, 10);
      }

      if (remaining) {
        rateLimitInfo.remaining = parseInt(remaining, 10);
      }

      if (reset) {
        // Reset is usually a Unix timestamp
        const resetTime = parseInt(reset, 10);
        rateLimitInfo.reset = new Date(resetTime * 1000);
      }

      // Anthropic-specific headers (if any)
      const requestsPerMinute = error.headers.get('anthropic-ratelimit-requests-limit');
      const tokensPerMinute = error.headers.get('anthropic-ratelimit-tokens-limit');
      const tokensPerDay = error.headers.get('anthropic-ratelimit-tokens-daily-limit');

      if (requestsPerMinute) {
        rateLimitInfo.requestsPerMinute = parseInt(requestsPerMinute, 10);
      }

      if (tokensPerMinute) {
        rateLimitInfo.tokensPerMinute = parseInt(tokensPerMinute, 10);
      }

      if (tokensPerDay) {
        rateLimitInfo.tokensPerDay = parseInt(tokensPerDay, 10);
      }
    }

    // If no retry-after header, estimate from error message or use default
    if (!rateLimitInfo.retryAfter) {
      // Default to 60 seconds
      rateLimitInfo.retryAfter = 60;
    }

    return rateLimitInfo;
  }

  /**
   * Format rate limit message with helpful information
   */
  private formatRateLimitMessage(info: RateLimitInfo): string {
    let message = 'Rate limit exceeded.';

    if (info.retryAfter) {
      message += ` Please try again in ${info.retryAfter} seconds.`;
    }

    if (info.requestsPerMinute) {
      message += ` Limit: ${info.requestsPerMinute} requests/minute.`;
    }

    if (info.tokensPerMinute) {
      message += ` Token limit: ${info.tokensPerMinute} tokens/minute.`;
    }

    return message;
  }
}

/**
 * Get singleton instance of Claude error mapper
 */
let claudeErrorMapperInstance: ClaudeErrorMapper | null = null;

export function getClaudeErrorMapper(): ClaudeErrorMapper {
  if (!claudeErrorMapperInstance) {
    claudeErrorMapperInstance = new ClaudeErrorMapper();
  }
  return claudeErrorMapperInstance;
}
