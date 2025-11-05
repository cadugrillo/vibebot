import prisma from '../config/database';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth.utils';
import {
  isAccountLocked,
  getRemainingLockTime,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '../utils/loginAttempts.utils';
import { UserRole } from '../generated/prisma';

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

/**
 * Register a new user with email and password
 * Checks for duplicate email, hashes password, creates user, and generates tokens
 * @param input - Registration input data
 * @returns User info, access token, and refresh token
 * @throws Error if email already exists or validation fails
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, name } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with default USER role
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
      role: UserRole.USER,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database with 7 day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Authenticate user with email and password
 * Includes account lockout logic for failed attempts
 * Generates access and refresh tokens, stores refresh token in database
 * @param email - User email
 * @param password - Plain text password
 * @returns User info, access token, and refresh token
 * @throws Error if credentials are invalid or account is locked
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  // Find user by email with login tracking fields
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      failedLoginAttempts: true,
      accountLockedUntil: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    // Don't reveal if user exists - return generic error
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (isAccountLocked(user)) {
    const remainingMinutes = getRemainingLockTime(user);
    throw new Error(
      `Account locked due to multiple failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
    );
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    // Increment failed attempts and potentially lock account
    await incrementFailedAttempts(user.id);
    throw new Error('Invalid email or password');
  }

  // Password is correct - reset failed attempts and update last login
  await resetFailedAttempts(user.id);

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database with 7 day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Generate new access token from valid refresh token
 * @param refreshToken - JWT refresh token
 * @returns New access token
 * @throws Error if refresh token is invalid or expired
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  // Verify refresh token JWT
  const decoded = verifyRefreshToken(refreshToken);

  // Check if refresh token exists in database and is not expired
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }

  // Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw new Error('Refresh token has expired');
  }

  // Generate new access token
  const newAccessToken = generateAccessToken({
    userId: decoded.userId,
    email: decoded.email,
  });

  return newAccessToken;
}

/**
 * Logout user from current device by invalidating refresh token
 * @param refreshToken - JWT refresh token to invalidate
 * @returns True if token was invalidated, false if not found
 */
export async function logout(refreshToken: string): Promise<boolean> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return result.count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Logout user from all devices by invalidating all refresh tokens
 * @param userId - User ID
 * @returns Number of tokens invalidated
 */
export async function logoutAll(userId: string): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { userId },
  });
  return result.count;
}

/**
 * Cleanup expired refresh tokens from database
 * Should be called periodically (e.g., via cron job)
 * @returns Number of tokens deleted
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User object or null if not found
 */
export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}
