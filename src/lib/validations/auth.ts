/**
 * Authentication Validation Schemas
 *
 * This module contains all Zod validation schemas for authentication-related
 * forms and API operations. All error messages are in Turkish as per the
 * project requirements.
 *
 * Schemas:
 * - loginSchema: Email/password login validation
 * - registerSchema: New user registration validation
 * - forgotPasswordSchema: Password reset request validation
 * - resetPasswordSchema: Password reset confirmation validation
 * - emailVerificationSchema: Email verification token validation
 * - updatePasswordSchema: Authenticated user password change
 *
 * @see https://zod.dev
 * @see https://react-hook-form.com/get-started#SchemaValidation
 *
 * @example
 * ```tsx
 * import { loginSchema, type LoginInput } from '@/lib/validations/auth'
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 *
 * function LoginForm() {
 *   const form = useForm<LoginInput>({
 *     resolver: zodResolver(loginSchema),
 *     defaultValues: { email: '', password: '' }
 *   })
 *   // ...
 * }
 * ```
 */

import { z } from 'zod'

/**
 * Password validation constants
 * These define the minimum requirements for password strength
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72 // bcrypt limit
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional but recommended
} as const

/**
 * Turkish error messages for authentication validation
 * Centralized for consistency and easy maintenance
 */
export const AUTH_ERROR_MESSAGES = {
  // Email
  emailRequired: 'E-posta adresi gereklidir',
  emailInvalid: 'Geçerli bir e-posta adresi giriniz',
  emailTooLong: 'E-posta adresi 255 karakterden uzun olamaz',

  // Password
  passwordRequired: 'Şifre gereklidir',
  passwordTooShort: `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`,
  passwordTooLong: `Şifre en fazla ${PASSWORD_MAX_LENGTH} karakter olabilir`,
  passwordNoUppercase: 'Şifre en az bir büyük harf içermelidir',
  passwordNoLowercase: 'Şifre en az bir küçük harf içermelidir',
  passwordNoNumber: 'Şifre en az bir rakam içermelidir',
  passwordNoSpecialChar: 'Şifre en az bir özel karakter içermelidir',
  passwordsDoNotMatch: 'Şifreler eşleşmiyor',
  currentPasswordRequired: 'Mevcut şifrenizi giriniz',

  // Name
  fullNameRequired: 'Ad ve soyad gereklidir',
  fullNameTooShort: 'Ad ve soyad en az 2 karakter olmalıdır',
  fullNameTooLong: 'Ad ve soyad 100 karakterden uzun olamaz',
  fullNameInvalid: 'Ad ve soyad sadece harf ve boşluk içerebilir',

  // Phone
  phoneInvalid: 'Geçerli bir telefon numarası giriniz',
  phoneTooShort: 'Telefon numarası en az 10 karakter olmalıdır',
  phoneTooLong: 'Telefon numarası 20 karakterden uzun olamaz',

  // Token
  tokenRequired: 'Doğrulama kodu gereklidir',
  tokenInvalid: 'Geçersiz doğrulama kodu',

  // Terms
  termsRequired: 'Kullanım koşullarını kabul etmelisiniz',

  // Generic
  invalidInput: 'Geçersiz giriş',
} as const

/**
 * Email validation schema
 * Reusable for all email fields
 */
export const emailSchema = z
  .string({
    required_error: AUTH_ERROR_MESSAGES.emailRequired,
    invalid_type_error: AUTH_ERROR_MESSAGES.emailInvalid,
  })
  .min(1, AUTH_ERROR_MESSAGES.emailRequired)
  .max(255, AUTH_ERROR_MESSAGES.emailTooLong)
  .email(AUTH_ERROR_MESSAGES.emailInvalid)
  .toLowerCase()
  .trim()

/**
 * Password validation schema with strength requirements
 * Enforces minimum security standards
 */
export const passwordSchema = z
  .string({
    required_error: AUTH_ERROR_MESSAGES.passwordRequired,
    invalid_type_error: AUTH_ERROR_MESSAGES.passwordRequired,
  })
  .min(PASSWORD_MIN_LENGTH, AUTH_ERROR_MESSAGES.passwordTooShort)
  .max(PASSWORD_MAX_LENGTH, AUTH_ERROR_MESSAGES.passwordTooLong)
  .refine(
    (password) => /[A-Z]/.test(password),
    AUTH_ERROR_MESSAGES.passwordNoUppercase
  )
  .refine(
    (password) => /[a-z]/.test(password),
    AUTH_ERROR_MESSAGES.passwordNoLowercase
  )
  .refine(
    (password) => /\d/.test(password),
    AUTH_ERROR_MESSAGES.passwordNoNumber
  )

/**
 * Simplified password schema for login
 * Does not enforce strength requirements (existing passwords may not meet them)
 */
export const loginPasswordSchema = z
  .string({
    required_error: AUTH_ERROR_MESSAGES.passwordRequired,
    invalid_type_error: AUTH_ERROR_MESSAGES.passwordRequired,
  })
  .min(1, AUTH_ERROR_MESSAGES.passwordRequired)
  .max(PASSWORD_MAX_LENGTH, AUTH_ERROR_MESSAGES.passwordTooLong)

/**
 * Full name validation schema
 * Allows Turkish characters (ğ, ü, ş, ı, ö, ç)
 */
export const fullNameSchema = z
  .string({
    required_error: AUTH_ERROR_MESSAGES.fullNameRequired,
    invalid_type_error: AUTH_ERROR_MESSAGES.fullNameInvalid,
  })
  .min(2, AUTH_ERROR_MESSAGES.fullNameTooShort)
  .max(100, AUTH_ERROR_MESSAGES.fullNameTooLong)
  .regex(
    /^[\p{L}\s'-]+$/u,
    AUTH_ERROR_MESSAGES.fullNameInvalid
  )
  .trim()

/**
 * Phone number validation schema
 * Supports Turkish phone formats and international numbers
 */
export const phoneSchema = z
  .string()
  .min(10, AUTH_ERROR_MESSAGES.phoneTooShort)
  .max(20, AUTH_ERROR_MESSAGES.phoneTooLong)
  .regex(
    /^[+]?[\d\s()-]+$/,
    AUTH_ERROR_MESSAGES.phoneInvalid
  )
  .optional()
  .or(z.literal(''))
  .transform((val) => val || undefined)

/**
 * Login Schema
 *
 * Used for authenticating existing users.
 * Password requirements are relaxed since existing passwords
 * may not meet current strength requirements.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
})

/**
 * Registration Schema
 *
 * Used for new user registration.
 * Includes password confirmation and terms acceptance.
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({
      required_error: AUTH_ERROR_MESSAGES.passwordRequired,
    }),
    fullName: fullNameSchema,
    phone: phoneSchema,
    acceptTerms: z.boolean().refine(
      (val) => val === true,
      AUTH_ERROR_MESSAGES.termsRequired
    ),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: AUTH_ERROR_MESSAGES.passwordsDoNotMatch,
      path: ['confirmPassword'],
    }
  )

/**
 * Forgot Password Schema
 *
 * Used for initiating a password reset request.
 * Only requires email address.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

/**
 * Reset Password Schema
 *
 * Used for completing a password reset.
 * Requires new password and confirmation.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({
      required_error: AUTH_ERROR_MESSAGES.passwordRequired,
    }),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: AUTH_ERROR_MESSAGES.passwordsDoNotMatch,
      path: ['confirmPassword'],
    }
  )

/**
 * Update Password Schema
 *
 * Used for authenticated users changing their password.
 * Requires current password for verification.
 */
export const updatePasswordSchema = z
  .object({
    currentPassword: z.string({
      required_error: AUTH_ERROR_MESSAGES.currentPasswordRequired,
    }).min(1, AUTH_ERROR_MESSAGES.currentPasswordRequired),
    newPassword: passwordSchema,
    confirmPassword: z.string({
      required_error: AUTH_ERROR_MESSAGES.passwordRequired,
    }),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: AUTH_ERROR_MESSAGES.passwordsDoNotMatch,
      path: ['confirmPassword'],
    }
  )
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: 'Yeni şifre mevcut şifreden farklı olmalıdır',
      path: ['newPassword'],
    }
  )

/**
 * Email Verification Schema
 *
 * Used for verifying email with a token (from email link or code input).
 */
export const emailVerificationSchema = z.object({
  token: z
    .string({
      required_error: AUTH_ERROR_MESSAGES.tokenRequired,
    })
    .min(1, AUTH_ERROR_MESSAGES.tokenRequired)
    .trim(),
  type: z.enum(['signup', 'recovery', 'invite', 'email_change']).optional(),
})

/**
 * OTP Verification Schema
 *
 * Used for verifying one-time password codes (6 digits).
 */
export const otpVerificationSchema = z.object({
  email: emailSchema,
  token: z
    .string({
      required_error: AUTH_ERROR_MESSAGES.tokenRequired,
    })
    .length(6, 'Doğrulama kodu 6 haneli olmalıdır')
    .regex(/^\d{6}$/, AUTH_ERROR_MESSAGES.tokenInvalid),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Inferred types from schemas for use with React Hook Form and TypeScript
 */
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Password strength levels for UI feedback
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

/**
 * Password strength check result
 */
export interface PasswordStrengthResult {
  strength: PasswordStrength
  score: number // 0-4
  feedback: string[]
}

/**
 * Check password strength and provide user feedback
 *
 * Returns a score from 0-4 and Turkish feedback messages.
 * This is for UI feedback only - actual validation is done by Zod schemas.
 *
 * @param password - The password to check
 * @returns Password strength result with score and feedback
 *
 * @example
 * ```tsx
 * const result = checkPasswordStrength('MyPassword123')
 * // { strength: 'good', score: 3, feedback: [] }
 * ```
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= PASSWORD_MIN_LENGTH) {
    score += 1
  } else {
    feedback.push(`En az ${PASSWORD_MIN_LENGTH} karakter`)
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Bir büyük harf ekleyin')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Bir küçük harf ekleyin')
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Bir rakam ekleyin')
  }

  // Bonus for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password) && score === 4) {
    // Already maxed, but we could track this separately
  }

  // Determine strength level
  let strength: PasswordStrength
  if (score <= 1) {
    strength = 'weak'
  } else if (score === 2) {
    strength = 'fair'
  } else if (score === 3) {
    strength = 'good'
  } else {
    strength = 'strong'
  }

  return { strength, score, feedback }
}

/**
 * Get password strength color for UI
 *
 * @param strength - Password strength level
 * @returns Tailwind CSS color class
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500'
    case 'fair':
      return 'bg-orange-500'
    case 'good':
      return 'bg-yellow-500'
    case 'strong':
      return 'bg-green-500'
  }
}

/**
 * Get password strength label in Turkish
 *
 * @param strength - Password strength level
 * @returns Turkish label for the strength
 */
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'Zayıf'
    case 'fair':
      return 'Orta'
    case 'good':
      return 'İyi'
    case 'strong':
      return 'Güçlü'
  }
}

/**
 * Validate a single field against its schema
 *
 * Useful for real-time field validation without validating the entire form.
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Validation result with success flag and optional error
 *
 * @example
 * ```tsx
 * const result = validateField(emailSchema, 'test@example.com')
 * if (!result.success) {
 *   console.log(result.error) // Turkish error message
 * }
 * ```
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message ?? AUTH_ERROR_MESSAGES.invalidInput,
  }
}

/**
 * Format Zod errors into a simple error map
 *
 * Converts Zod's error format into a flat object mapping field names to error messages.
 * Useful for displaying errors in forms.
 *
 * @param error - Zod error object
 * @returns Object mapping field paths to error messages
 *
 * @example
 * ```tsx
 * const result = loginSchema.safeParse({ email: '', password: '' })
 * if (!result.success) {
 *   const errors = formatZodErrors(result.error)
 *   // { email: 'E-posta adresi gereklidir', password: 'Şifre gereklidir' }
 * }
 * ```
 */
export function formatZodErrors(
  error: z.ZodError
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.errors) {
    const path = issue.path.join('.')
    // Only take the first error for each field
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return errors
}
