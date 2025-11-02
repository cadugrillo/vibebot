/**
 * Provider Preference Manager
 * VBT-171: Manages user and conversation-level provider preferences
 *
 * Stores and retrieves provider preferences per user and per conversation.
 * Supports hierarchical preferences: conversation > user > system default.
 */

import { ProviderType, ProviderPreference } from './types';

/**
 * Preference key generator
 */
function makeKey(userId: string, conversationId?: string): string {
  return conversationId ? `${userId}:${conversationId}` : userId;
}

/**
 * Provider Preference Manager
 *
 * Manages provider preferences at different levels:
 * 1. Conversation-level: Specific to a user + conversation
 * 2. User-level: Default for all conversations for a user
 * 3. System-level: Global default (not stored in preferences)
 *
 * Priority order: Conversation > User > System Default
 *
 * Features:
 * - In-memory storage (can be extended to database)
 * - Hierarchical preference resolution
 * - Per-conversation and per-user preferences
 * - Cost constraints per preference
 *
 * @example
 * ```typescript
 * const manager = new ProviderPreferenceManager();
 *
 * // Set user-level preference
 * manager.setPreference({
 *   userId: 'user-123',
 *   preferredProvider: ProviderType.CLAUDE,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 *
 * // Set conversation-level preference
 * manager.setPreference({
 *   userId: 'user-123',
 *   conversationId: 'conv-456',
 *   preferredProvider: ProviderType.OPENAI,
 *   preferredModel: 'gpt-4-turbo',
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 *
 * // Get preference (conversation-level takes precedence)
 * const provider = manager.getPreferredProvider('user-123', 'conv-456');
 * // Returns: ProviderType.OPENAI
 * ```
 */
export class ProviderPreferenceManager {
  private static instance: ProviderPreferenceManager | null = null;

  /** In-memory preference storage (key = userId or userId:conversationId) */
  private preferences: Map<string, ProviderPreference> = new Map();

  /** System-wide default provider (fallback when no preference set) */
  private systemDefault: ProviderType = ProviderType.CLAUDE;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('ProviderPreferenceManager initialized');
    console.log(`System default provider: ${this.systemDefault}`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderPreferenceManager {
    if (!ProviderPreferenceManager.instance) {
      ProviderPreferenceManager.instance = new ProviderPreferenceManager();
    }
    return ProviderPreferenceManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ProviderPreferenceManager.instance = null;
  }

  /**
   * Set system-wide default provider
   *
   * @param provider - Default provider to use when no preference exists
   */
  public setSystemDefault(provider: ProviderType): void {
    this.systemDefault = provider;
    console.log(`ProviderPreferenceManager: System default set to ${provider}`);
  }

  /**
   * Get system-wide default provider
   */
  public getSystemDefault(): ProviderType {
    return this.systemDefault;
  }

  /**
   * Set provider preference
   *
   * @param preference - Preference to set
   */
  public setPreference(preference: ProviderPreference): void {
    const key = makeKey(preference.userId, preference.conversationId);

    // Update timestamp
    preference.updatedAt = new Date();

    if (!preference.createdAt) {
      preference.createdAt = new Date();
    }

    this.preferences.set(key, preference);

    const level = preference.conversationId ? 'conversation' : 'user';
    console.log(
      `ProviderPreferenceManager: Set ${level}-level preference for ${key}: ${preference.preferredProvider}`
    );
  }

  /**
   * Get provider preference
   *
   * Returns conversation-level preference if exists, otherwise user-level,
   * otherwise null.
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns Preference object, or null if not found
   */
  public getPreference(
    userId: string,
    conversationId?: string
  ): ProviderPreference | null {
    // Try conversation-level first
    if (conversationId) {
      const convKey = makeKey(userId, conversationId);
      const convPref = this.preferences.get(convKey);
      if (convPref) {
        return convPref;
      }
    }

    // Fall back to user-level
    const userKey = makeKey(userId);
    const userPref = this.preferences.get(userKey);
    if (userPref) {
      return userPref;
    }

    // No preference found
    return null;
  }

  /**
   * Get preferred provider for a user/conversation
   *
   * Resolves preference hierarchy: conversation > user > system default
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns Preferred provider type
   */
  public getPreferredProvider(
    userId: string,
    conversationId?: string
  ): ProviderType {
    const preference = this.getPreference(userId, conversationId);

    if (preference) {
      return preference.preferredProvider;
    }

    // No preference found, use system default
    return this.systemDefault;
  }

  /**
   * Get preferred model for a user/conversation
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns Preferred model ID, or null if not set
   */
  public getPreferredModel(
    userId: string,
    conversationId?: string
  ): string | null {
    const preference = this.getPreference(userId, conversationId);
    return preference?.preferredModel || null;
  }

  /**
   * Get max cost per message for a user/conversation
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns Max cost constraint, or null if not set
   */
  public getMaxCostPerMessage(
    userId: string,
    conversationId?: string
  ): number | null {
    const preference = this.getPreference(userId, conversationId);
    return preference?.maxCostPerMessage || null;
  }

  /**
   * Check if preference exists for user/conversation
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns True if preference exists
   */
  public hasPreference(userId: string, conversationId?: string): boolean {
    return this.getPreference(userId, conversationId) !== null;
  }

  /**
   * Delete preference for user/conversation
   *
   * @param userId - User ID
   * @param conversationId - Optional conversation ID
   * @returns True if preference was deleted
   */
  public deletePreference(userId: string, conversationId?: string): boolean {
    const key = makeKey(userId, conversationId);
    const existed = this.preferences.has(key);

    if (existed) {
      this.preferences.delete(key);
      const level = conversationId ? 'conversation' : 'user';
      console.log(
        `ProviderPreferenceManager: Deleted ${level}-level preference for ${key}`
      );
    }

    return existed;
  }

  /**
   * Delete all preferences for a user
   *
   * Removes both user-level and all conversation-level preferences
   *
   * @param userId - User ID
   * @returns Number of preferences deleted
   */
  public deleteAllUserPreferences(userId: string): number {
    let count = 0;

    // Find all keys starting with userId
    const keysToDelete: string[] = [];
    for (const key of this.preferences.keys()) {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    }

    // Delete them
    for (const key of keysToDelete) {
      this.preferences.delete(key);
      count++;
    }

    if (count > 0) {
      console.log(
        `ProviderPreferenceManager: Deleted ${count} preferences for user ${userId}`
      );
    }

    return count;
  }

  /**
   * Get all preferences (useful for admin/debugging)
   *
   * @returns Array of all stored preferences
   */
  public getAllPreferences(): ProviderPreference[] {
    return Array.from(this.preferences.values());
  }

  /**
   * Get all preferences for a specific user
   *
   * @param userId - User ID
   * @returns Array of preferences for this user
   */
  public getUserPreferences(userId: string): ProviderPreference[] {
    const userPrefs: ProviderPreference[] = [];

    for (const [key, pref] of this.preferences.entries()) {
      if (key.startsWith(userId)) {
        userPrefs.push(pref);
      }
    }

    return userPrefs;
  }

  /**
   * Get statistics about stored preferences
   *
   * @returns Preference statistics
   */
  public getStats(): {
    total: number;
    byProvider: Record<string, number>;
    withCostConstraints: number;
    withModelPreference: number;
  } {
    const byProvider: Record<string, number> = {};
    let withCostConstraints = 0;
    let withModelPreference = 0;

    for (const pref of this.preferences.values()) {
      // Count by provider
      byProvider[pref.preferredProvider] =
        (byProvider[pref.preferredProvider] || 0) + 1;

      // Count constraints
      if (pref.maxCostPerMessage !== undefined) {
        withCostConstraints++;
      }

      if (pref.preferredModel !== undefined) {
        withModelPreference++;
      }
    }

    return {
      total: this.preferences.size,
      byProvider,
      withCostConstraints,
      withModelPreference,
    };
  }

  /**
   * Clear all preferences
   * Useful for testing or reset operations
   */
  public clearAll(): void {
    const count = this.preferences.size;
    this.preferences.clear();
    console.log(`ProviderPreferenceManager: Cleared ${count} preferences`);
  }
}

/**
 * Get singleton instance of ProviderPreferenceManager
 */
export function getPreferenceManager(): ProviderPreferenceManager {
  return ProviderPreferenceManager.getInstance();
}

/**
 * Reset preference manager (for testing)
 */
export function resetPreferenceManager(): void {
  ProviderPreferenceManager.resetInstance();
}
