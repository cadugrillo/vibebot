import { z } from 'zod';

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

/**
 * Email validation using Zod's built-in email validation
 */
const emailSchema = z.string().email('Invalid email format');

/**
 * Registration request validation schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
});

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Type inference for registration DTO
 */
export type RegisterDTO = z.infer<typeof registerSchema>;

/**
 * Type inference for login DTO
 */
export type LoginDTO = z.infer<typeof loginSchema>;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 * Returns an object with validation result and error messages
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  try {
    passwordSchema.parse(password);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.issues.map((err) => err.message),
      };
    }
    return { isValid: false, errors: ['Invalid password'] };
  }
}
