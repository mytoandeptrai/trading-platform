'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@repo/ui/components/button';
import { FormInput } from '@repo/ui/components/form-fields/form-input';

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must not exceed 50 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<void>;
  isLoading?: boolean;
}

export function RegisterForm({ onSubmit, isLoading }: RegisterFormProps) {
  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = methods.handleSubmit(async (data) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await onSubmit(registerData);
    } catch (error) {
      // Error handled by parent
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          control={methods.control}
          name="username"
          label="Username"
          placeholder="Enter your username"
          disabled={isLoading}
          description="3-50 characters, letters, numbers, underscore, hyphen only"
          required
        />

        <FormInput
          control={methods.control}
          name="email"
          label="Email"
          type="email"
          placeholder="Enter your email"
          disabled={isLoading}
          required
        />

        <FormInput
          control={methods.control}
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          disabled={isLoading}
          description="Min 8 chars with uppercase, lowercase, number & special char"
          required
        />

        <FormInput
          control={methods.control}
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          disabled={isLoading}
          required
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </FormProvider>
  );
}
