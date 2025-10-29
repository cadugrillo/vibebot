import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.utils';
import prisma from '../config/database';

/**
 * Authentication middleware to verify JWT tokens from cookies or Authorization header
 * Attaches decoded user information to req.user if token is valid
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get token from cookies first (HTTP-only cookie)
    let token = req.cookies?.accessToken;

    // If not in cookies, try Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    // If no token found, return 401
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user role from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: user.role,
    };

    next();
  } catch (error) {
    // Token is invalid or expired
    const message =
      error instanceof Error ? error.message : 'Invalid access token';

    res.status(401).json({
      error: 'Unauthorized',
      message,
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token present
 * Useful for routes that should work both with and without authentication
 */
export async function optionalAuthenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get token from cookies first
    let token = req.cookies?.accessToken;

    // If not in cookies, try Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // If token exists, verify and attach user info
    if (token) {
      const decoded = verifyAccessToken(token);

      // Fetch user role from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true },
      });

      if (user) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
}
