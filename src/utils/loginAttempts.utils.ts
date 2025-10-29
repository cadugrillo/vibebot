import prisma from '../config/database';

/**
 * Configuration constants for login attempt tracking
 */
const MAX_LOGIN_ATTEMPTS = parseInt(
  process.env.MAX_LOGIN_ATTEMPTS || '5',
  10
);
const ACCOUNT_LOCK_DURATION_MINUTES = parseInt(
  process.env.ACCOUNT_LOCK_DURATION_MINUTES || '15',
  10
);

/**
 * User object with login tracking fields
 */
interface UserWithLockInfo {
  id: string;
  accountLockedUntil: Date | null;
  failedLoginAttempts: number;
}

/**
 * Check if a user account is currently locked
 * @param user - User object with accountLockedUntil field
 * @returns True if account is locked, false otherwise
 */
export function isAccountLocked(user: UserWithLockInfo): boolean {
  if (!user.accountLockedUntil) {
    return false;
  }

  // Check if lock has expired
  const now = new Date();
  if (user.accountLockedUntil <= now) {
    // Lock has expired, account is no longer locked
    return false;
  }

  return true;
}

/**
 * Get remaining time until account unlock in minutes
 * @param user - User object with accountLockedUntil field
 * @returns Number of minutes until unlock, or 0 if not locked
 */
export function getRemainingLockTime(user: UserWithLockInfo): number {
  if (!user.accountLockedUntil) {
    return 0;
  }

  const now = new Date();
  const remainingMs = user.accountLockedUntil.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / (1000 * 60)); // Convert to minutes
}

/**
 * Increment failed login attempts for a user
 * Returns the new attempt count and locks account if threshold is reached
 * @param userId - User ID
 * @returns Updated failed attempt count
 */
export async function incrementFailedAttempts(
  userId: string
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newAttemptCount = user.failedLoginAttempts + 1;

  // Check if we should lock the account
  if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
    await lockAccount(userId, ACCOUNT_LOCK_DURATION_MINUTES);
    return newAttemptCount;
  }

  // Just increment the counter
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: newAttemptCount },
  });

  return newAttemptCount;
}

/**
 * Reset failed login attempts to 0
 * Called after successful login
 * @param userId - User ID
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
    },
  });
}

/**
 * Lock a user account for a specified duration
 * @param userId - User ID
 * @param durationMinutes - Duration in minutes to lock the account
 */
export async function lockAccount(
  userId: string,
  durationMinutes: number
): Promise<void> {
  const lockUntil = new Date();
  lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountLockedUntil: lockUntil,
      failedLoginAttempts: MAX_LOGIN_ATTEMPTS, // Set to max to indicate locked status
    },
  });
}

/**
 * Manually unlock a user account (for admin use)
 * Resets failed attempts and clears lock timestamp
 * @param userId - User ID
 */
export async function unlockAccount(userId: string): Promise<void> {
  await resetFailedAttempts(userId);
}

/**
 * Get the maximum number of login attempts allowed
 * @returns Maximum login attempts configuration value
 */
export function getMaxLoginAttempts(): number {
  return MAX_LOGIN_ATTEMPTS;
}

/**
 * Get the account lock duration in minutes
 * @returns Lock duration configuration value
 */
export function getLockDurationMinutes(): number {
  return ACCOUNT_LOCK_DURATION_MINUTES;
}
