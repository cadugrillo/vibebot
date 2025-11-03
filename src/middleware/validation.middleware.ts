import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Generic validation middleware factory
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and parse request body
      const validatedData = schema.parse(req.body);

      // Replace request body with validated data (removes any extra fields)
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors,
        });
        return;
      }

      // Handle unexpected errors
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
      });
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query) as Record<string, any>;
      // Can't directly assign to req.query (read-only), so copy properties
      Object.keys(validatedData).forEach((key) => {
        (req.query as any)[key] = validatedData[key];
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors,
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
      });
    }
  };
}

/**
 * Validate route parameters
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid route parameters',
          details: errors,
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
      });
    }
  };
}
