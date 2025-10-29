/**
 * useAuth Hook
 * Custom hook to access authentication context
 * Provides type-safe access to auth state and actions
 */

import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

/**
 * Access authentication context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Wrap your component tree with <AuthProvider> to use authentication.'
    );
  }

  return context;
}
