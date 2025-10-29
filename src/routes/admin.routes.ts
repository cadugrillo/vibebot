import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  unlockUserAccount,
  getUserStatus,
} from '../controllers/admin.controller';

const router = Router();

// Apply authentication and admin check to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * POST /api/admin/users/:userId/unlock
 * Unlock a user account (reset failed attempts and clear lock)
 * Requires: Admin authentication
 */
router.post('/users/:userId/unlock', unlockUserAccount);

/**
 * GET /api/admin/users/:userId
 * Get user account status including lock information
 * Requires: Admin authentication
 */
router.get('/users/:userId', getUserStatus);

export default router;
