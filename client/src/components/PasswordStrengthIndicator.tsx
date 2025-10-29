/**
 * Password Strength Indicator Component
 * Displays visual feedback for password strength and requirement checklist
 */

import { useMemo } from 'react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = useMemo<PasswordRequirement[]>(() => {
    return [
      {
        label: 'At least 8 characters',
        test: (pwd) => pwd.length >= 8,
        met: password.length >= 8,
      },
      {
        label: 'One uppercase letter',
        test: (pwd) => /[A-Z]/.test(pwd),
        met: /[A-Z]/.test(password),
      },
      {
        label: 'One lowercase letter',
        test: (pwd) => /[a-z]/.test(pwd),
        met: /[a-z]/.test(password),
      },
      {
        label: 'One number',
        test: (pwd) => /[0-9]/.test(pwd),
        met: /[0-9]/.test(password),
      },
      {
        label: 'One special character',
        test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
        met: /[^A-Za-z0-9]/.test(password),
      },
    ];
  }, [password]);

  // Calculate strength based on requirements met
  const metCount = requirements.filter((req) => req.met).length;
  const totalCount = requirements.length;
  const strengthPercentage = (metCount / totalCount) * 100;

  // Determine strength level and color
  const { strength, color } = useMemo(() => {
    if (metCount === 0 || password.length === 0) {
      return { strength: '', color: 'bg-gray-200' };
    } else if (metCount <= 2) {
      return { strength: 'Weak', color: 'bg-red-500' };
    } else if (metCount <= 4) {
      return { strength: 'Medium', color: 'bg-yellow-500' };
    } else {
      return { strength: 'Strong', color: 'bg-green-500' };
    }
  }, [metCount, password.length]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          {strength && (
            <span
              className={`font-medium ${
                strength === 'Weak'
                  ? 'text-red-500'
                  : strength === 'Medium'
                    ? 'text-yellow-500'
                    : 'text-green-500'
              }`}
            >
              {strength}
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Password must contain:</p>
        <ul className="space-y-1">
          {requirements.map((req, index) => (
            <li
              key={index}
              className={`text-sm flex items-center gap-2 ${
                req.met ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xs">
                {req.met ? '✓' : '○'}
              </span>
              {req.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
