import { Request, Response } from 'express';
import { unlockAccount } from '../utils/loginAttempts.utils';
import prisma from '../config/database';

/**
 * Unlock a user account
 * POST /api/admin/users/:userId/unlock
 * Requires admin authentication
 */
export async function unlockUserAccount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required',
      });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    // Unlock the account (resets failed attempts and clears lock)
    await unlockAccount(userId);

    // Log the action (admin who performed unlock)
    console.log(
      `Admin ${req.user?.email} (${req.user?.userId}) unlocked account for user ${user.email} (${user.id})`
    );

    res.status(200).json({
      message: 'User account unlocked successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      unlockedBy: {
        adminId: req.user?.userId,
        adminEmail: req.user?.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to unlock account';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}

/**
 * Get user account status
 * GET /api/admin/users/:userId
 * Requires admin authentication
 */
export async function getUserStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required',
      });
      return;
    }

    // Fetch user with login tracking info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    // Determine if account is currently locked
    const isLocked =
      user.accountLockedUntil !== null && user.accountLockedUntil > new Date();

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        failedLoginAttempts: user.failedLoginAttempts,
        accountLockedUntil: user.accountLockedUntil,
        isLocked,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch user status';

    res.status(500).json({
      error: 'Internal Server Error',
      message,
    });
  }
}
