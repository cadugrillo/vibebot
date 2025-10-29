import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../generated/prisma';

/**
 * Middleware to require admin role
 * Must be used after authenticateToken middleware
 * Checks if authenticated user has ADMIN role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Check if user has admin role
  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return;
  }

  next();
}
