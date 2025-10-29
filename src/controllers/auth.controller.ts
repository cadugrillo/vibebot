import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

/**
 * Registration endpoint handler
 * POST /api/auth/register
 */
export async function registerHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Register user (validation already done by middleware)
    const result = await authService.register({ email, password, name });

    // Set HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('accessToken', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    // Return user info and tokens
    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message === 'Email already registered') {
      res.status(409).json({
        error: 'Conflict',
        message,
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during registration',
      });
    }
  }
}

/**
 * Login endpoint handler
 * POST /api/auth/login
 */
export async function loginHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    // Authenticate user
    const result = await authService.login(email, password);

    // Set HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    res.cookie('accessToken', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    // Return user info and tokens
    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    if (message === 'Invalid email or password') {
      res.status(401).json({
        error: 'Unauthorized',
        message,
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during login',
      });
    }
  }
}

/**
 * Refresh token endpoint handler
 * POST /api/auth/refresh
 */
export async function refreshTokenHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Get refresh token from cookies or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
      });
      return;
    }

    // Generate new access token
    const newAccessToken = await authService.refreshAccessToken(refreshToken);

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token refresh failed';

    res.status(401).json({
      error: 'Unauthorized',
      message,
    });
  }
}

/**
 * Logout endpoint handler (single device)
 * POST /api/auth/logout
 */
export async function logoutHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Get refresh token from cookies or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout',
    });
  }
}

/**
 * Logout from all devices endpoint handler
 * POST /api/auth/logout-all
 * Requires authentication
 */
export async function logoutAllHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const count = await authService.logoutAll(req.user.userId);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      message: 'Logged out from all devices successfully',
      devicesLoggedOut: count,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout',
    });
  }
}
