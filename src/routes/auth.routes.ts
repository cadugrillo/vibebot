import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  logoutAllHandler,
  getCurrentUserHandler,
} from '../controllers/auth.controller';
import {
  authRateLimiter,
  refreshRateLimiter,
} from '../middleware/rateLimiter.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validators';

const router = Router();

/**
 * POST /api/auth/register
 * User registration endpoint
 * Rate limited: 5 requests per 15 minutes
 * Validates: email format, password strength, name (optional)
 */
router.post(
  '/register',
  authRateLimiter,
  validateRequest(registerSchema),
  registerHandler
);

/**
 * POST /api/auth/login
 * User login endpoint
 * Rate limited: 5 requests per 15 minutes
 */
router.post('/login', authRateLimiter, validateRequest(loginSchema), loginHandler);

/**
 * POST /api/auth/refresh
 * Refresh access token endpoint
 * Rate limited: 10 requests per 15 minutes
 */
router.post('/refresh', refreshRateLimiter, refreshTokenHandler);

/**
 * POST /api/auth/logout
 * Logout from current device
 * No authentication required (can logout with just refresh token)
 */
router.post('/logout', logoutHandler);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 * Requires authentication
 */
router.post('/logout-all', authenticateToken, logoutAllHandler);

/**
 * GET /api/auth/me
 * Get current user information
 * Requires authentication
 */
router.get('/me', authenticateToken, getCurrentUserHandler);

export default router;
