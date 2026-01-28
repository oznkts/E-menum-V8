'use server'

/**
 * Authentication Server Actions
 *
 * This module contains all authentication-related Server Actions for:
 * - Login (email/password)
 * - Registration (with email verification)
 * - Logout
 * - Password Reset (request and confirm)
 * - Email Verification
 *
 * Security Features:
 * - Rate limiting consideration (via middleware/Upstash)
 * - Account enumeration protection (constant-time responses)
 * - Input validation with Zod schemas
 * - Turkish error messages
 * - Audit logging preparation
 *
 * @see Auth Security & Rate Limiting Talimatnamesi.md
 * @see https://supabase.com/docs/guides/auth
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  emailVerificationSchema,
  updatePasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/validations/auth'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard action response for all auth operations
 * Follows the pattern from Auth Security Talimatnamesi
 */
export interface AuthActionResponse {
  success: boolean
  message: string
  error?: string
  errorCode?: AuthErrorCode
  retryAfter?: number // For rate limiting
  requiresCaptcha?: boolean
  redirectTo?: string
}

/**
 * Auth error codes for programmatic handling
 */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'rate_limit_exceeded'
  | 'account_locked'
  | 'email_not_verified'
  | 'invalid_token'
  | 'token_expired'
  | 'captcha_required'
  | 'password_too_weak'
  | 'validation_error'
  | 'user_exists'
  | 'server_error'
  | 'unknown_error'

/**
 * Turkish error messages for authentication
 * Generic messages to prevent account enumeration
 */
const AUTH_MESSAGES = {
  // Login
  loginSuccess: 'Giriş başarılı',
  loginFailed: 'E-posta veya şifre hatalı', // Generic to prevent enumeration
  accountLocked: 'Hesabınız geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.',
  emailNotVerified: 'Lütfen e-posta adresinizi doğrulayın',

  // Register
  registerSuccess: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.',
  registerEmailSent: 'Eğer bu e-posta kayıtlı değilse, doğrulama linki gönderildi.', // Generic
  userExists: 'Bu e-posta adresi zaten kayıtlı',

  // Logout
  logoutSuccess: 'Çıkış yapıldı',

  // Password Reset
  resetRequestSuccess: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi.', // Generic
  resetSuccess: 'Şifreniz başarıyla güncellendi',
  resetTokenInvalid: 'Şifre sıfırlama linki geçersiz veya süresi dolmuş',
  resetTokenExpired: 'Şifre sıfırlama linkinin süresi dolmuş',

  // Email Verification
  verificationSuccess: 'E-posta adresiniz doğrulandı',
  verificationFailed: 'Doğrulama başarısız. Lütfen tekrar deneyin.',
  verificationTokenInvalid: 'Doğrulama linki geçersiz veya süresi dolmuş',

  // Password Update
  passwordUpdateSuccess: 'Şifreniz başarıyla güncellendi',
  currentPasswordWrong: 'Mevcut şifreniz hatalı',

  // Rate Limiting
  rateLimitExceeded: 'Çok fazla deneme. Lütfen {minutes} dakika sonra tekrar deneyin.',

  // Generic
  validationError: 'Girilen bilgiler geçersiz',
  serverError: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  unknownError: 'Beklenmeyen bir hata oluştu',
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get client IP address from request headers
 * Used for rate limiting and audit logging
 */
async function getClientIP(): Promise<string> {
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIP = headersList.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/**
 * Get user agent from request headers
 * Used for audit logging and suspicious activity detection
 */
async function getUserAgent(): Promise<string> {
  const headersList = await headers()
  return headersList.get('user-agent') ?? 'unknown'
}

/**
 * Add artificial delay for constant-time responses
 * Prevents timing attacks that could reveal user existence
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
async function addResponseDelay(minMs: number = 300, maxMs: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Format rate limit message with remaining time
 * Exported for use by middleware and UI components
 */
export async function formatRateLimitMessage(seconds: number): Promise<string> {
  const minutes = Math.ceil(seconds / 60)
  return AUTH_MESSAGES.rateLimitExceeded.replace('{minutes}', minutes.toString())
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  message: string,
  errorCode: AuthErrorCode,
  additionalData?: Partial<AuthActionResponse>
): AuthActionResponse {
  return {
    success: false,
    message,
    errorCode,
    ...additionalData,
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse(
  message: string,
  additionalData?: Partial<AuthActionResponse>
): AuthActionResponse {
  return {
    success: true,
    message,
    ...additionalData,
  }
}

// =============================================================================
// LOGIN ACTION
// =============================================================================

/**
 * Login Server Action
 *
 * Authenticates a user with email and password.
 *
 * Security measures:
 * - Input validation with Zod
 * - Generic error messages to prevent account enumeration
 * - Constant-time responses for failed attempts
 * - Prepares data for rate limiting (handled by middleware)
 *
 * @param _prevState - Previous form state (for useFormState)
 * @param formData - Form data containing email and password
 * @returns AuthActionResponse with success/failure status
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useFormState } from 'react-dom'
 * import { login } from '@/lib/actions/auth'
 *
 * function LoginForm() {
 *   const [state, action] = useFormState(login, null)
 *   return <form action={action}>...</form>
 * }
 * ```
 */
export async function login(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      email: formData.get('email'),
      password: formData.get('password'),
    }

    const validationResult = loginSchema.safeParse(rawInput)

    if (!validationResult.success) {
      return createErrorResponse(
        AUTH_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { email, password } = validationResult.data

    // 2. Get client info for logging (not used for actual rate limiting here)
    const _clientIP = await getClientIP()
    const _userAgent = await getUserAgent()

    // 3. Attempt authentication
    const supabase = await createClient()
    
    // Debug: Log authentication attempt
    console.log('[Auth] Attempting login for:', email)
    console.log('[Auth] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // 4. Handle authentication result
    if (error) {
      // Log detailed error for debugging
      console.error('[Auth] Login error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        error: error,
      })

      // Add delay for constant-time response (prevents timing attacks)
      await addResponseDelay()

      // Check for specific error types
      if (error.message.includes('Invalid login credentials')) {
        return createErrorResponse(
          AUTH_MESSAGES.loginFailed,
          'invalid_credentials'
        )
      }

      if (error.message.includes('Email not confirmed')) {
        return createErrorResponse(
          AUTH_MESSAGES.emailNotVerified,
          'email_not_verified'
        )
      }

      // Generic error for other cases - but log the actual error
      console.error('[Auth] Unexpected login error:', error.message)
      return createErrorResponse(
        AUTH_MESSAGES.loginFailed,
        'invalid_credentials'
      )
    }

    // 5. Successful login
    if (data.user) {
      // Revalidate cached data
      revalidatePath('/', 'layout')

      return createSuccessResponse(AUTH_MESSAGES.loginSuccess, {
        redirectTo: '/dashboard',
      })
    }

    // Fallback error
    return createErrorResponse(AUTH_MESSAGES.loginFailed, 'invalid_credentials')
  } catch (error) {
    // Log error for debugging (not exposed to client)
    console.error('[Auth] Login exception:', error)
    if (error instanceof Error) {
      console.error('[Auth] Error message:', error.message)
      console.error('[Auth] Error stack:', error.stack)
    }

    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}

/**
 * Login and redirect (for use outside of forms)
 */
export async function loginAndRedirect(input: LoginInput): Promise<void> {
  const validationResult = loginSchema.safeParse(input)

  if (!validationResult.success) {
    throw new Error(AUTH_MESSAGES.validationError)
  }

  const { email, password } = validationResult.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(AUTH_MESSAGES.loginFailed)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// =============================================================================
// REGISTER ACTION
// =============================================================================

/**
 * Register Server Action
 *
 * Creates a new user account with email verification.
 *
 * Security measures:
 * - Input validation with Zod
 * - Password strength requirements
 * - Generic success message (prevents email enumeration)
 * - Prepares data for rate limiting (handled by middleware)
 *
 * @param _prevState - Previous form state
 * @param formData - Form data with registration details
 * @returns AuthActionResponse with success/failure status
 */
export async function register(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Extract and validate input
    const rawInput = {
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      fullName: formData.get('fullName'),
      phone: formData.get('phone') || undefined,
      acceptTerms: formData.get('acceptTerms') === 'true' || formData.get('acceptTerms') === 'on',
    }

    const validationResult = registerSchema.safeParse(rawInput)

    if (!validationResult.success) {
      // Return first validation error
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? AUTH_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { email, password, fullName, phone } = validationResult.data

    // 2. Get request origin for email redirect
    const headersList = await headers()
    const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    // 3. Create user account
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: fullName,
          phone: phone ?? null,
        },
      },
    })

    // 4. Handle result
    if (error) {
      // Add delay for constant-time response
      await addResponseDelay()

      // Check for user already exists
      if (error.message.includes('User already registered')) {
        // Return generic message to prevent enumeration
        return createSuccessResponse(AUTH_MESSAGES.registerEmailSent)
      }

      return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
    }

    // 5. Check if email confirmation is required
    if (data.user && !data.session) {
      // User created but needs email verification
      return createSuccessResponse(AUTH_MESSAGES.registerSuccess)
    }

    // User created and auto-confirmed (for local dev or disabled confirmation)
    if (data.user && data.session) {
      revalidatePath('/', 'layout')
      return createSuccessResponse(AUTH_MESSAGES.loginSuccess, {
        redirectTo: '/dashboard',
      })
    }

    // Generic success (email sent)
    return createSuccessResponse(AUTH_MESSAGES.registerEmailSent)
  } catch (error) {
    console.error('[Auth] Register error:', error)
    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}

/**
 * Register and redirect (for programmatic use)
 */
export async function registerAndRedirect(input: RegisterInput): Promise<void> {
  const validationResult = registerSchema.safeParse(input)

  if (!validationResult.success) {
    throw new Error(AUTH_MESSAGES.validationError)
  }

  const { email, password, fullName, phone } = validationResult.data
  const headersList = await headers()
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        phone: phone ?? null,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  // Email verification required - redirect to confirmation page
  redirect('/verify-email?email=' + encodeURIComponent(email))
}

// =============================================================================
// LOGOUT ACTION
// =============================================================================

/**
 * Logout Server Action
 *
 * Signs out the current user and clears the session.
 *
 * @returns AuthActionResponse indicating success
 */
export async function logout(): Promise<AuthActionResponse> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth] Logout error:', error)
      // Still consider it a success for the user
    }

    revalidatePath('/', 'layout')

    return createSuccessResponse(AUTH_MESSAGES.logoutSuccess, {
      redirectTo: '/',
    })
  } catch (error) {
    console.error('[Auth] Logout error:', error)
    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}

/**
 * Logout and redirect
 */
export async function logoutAndRedirect(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// =============================================================================
// FORGOT PASSWORD ACTION
// =============================================================================

/**
 * Forgot Password Server Action
 *
 * Initiates a password reset by sending a reset link to the user's email.
 *
 * Security measures:
 * - Generic response regardless of email existence (prevents enumeration)
 * - Rate limiting (handled by middleware)
 * - Constant-time response
 *
 * @param _prevState - Previous form state
 * @param formData - Form data containing email
 * @returns AuthActionResponse (always success to prevent enumeration)
 */
export async function forgotPassword(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Validate input
    const rawInput = {
      email: formData.get('email'),
    }

    const validationResult = forgotPasswordSchema.safeParse(rawInput)

    if (!validationResult.success) {
      return createErrorResponse(
        AUTH_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { email } = validationResult.data

    // 2. Get request origin for redirect
    const headersList = await headers()
    const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    // 3. Send reset email
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })

    // 4. Add delay for constant-time response
    await addResponseDelay()

    // 5. Always return success message (prevents enumeration)
    // Even if there's an error or email doesn't exist
    if (error) {
      console.error('[Auth] Forgot password error:', error)
    }

    return createSuccessResponse(AUTH_MESSAGES.resetRequestSuccess)
  } catch (error) {
    console.error('[Auth] Forgot password error:', error)

    // Still return success to prevent enumeration
    await addResponseDelay()
    return createSuccessResponse(AUTH_MESSAGES.resetRequestSuccess)
  }
}

/**
 * Request password reset (programmatic)
 */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const validationResult = forgotPasswordSchema.safeParse(input)

  if (!validationResult.success) {
    throw new Error(AUTH_MESSAGES.validationError)
  }

  const { email } = validationResult.data
  const headersList = await headers()
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always succeed to prevent enumeration
}

// =============================================================================
// RESET PASSWORD ACTION
// =============================================================================

/**
 * Reset Password Server Action
 *
 * Completes password reset using a valid reset token.
 * The token is automatically handled by Supabase's auth callback.
 *
 * @param _prevState - Previous form state
 * @param formData - Form data with new password
 * @returns AuthActionResponse with success/failure status
 */
export async function resetPassword(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Validate input
    const rawInput = {
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    }

    const validationResult = resetPasswordSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? AUTH_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { password } = validationResult.data

    // 2. Update password
    // Note: User should already be authenticated via the reset link callback
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      if (error.message.includes('Auth session missing')) {
        return createErrorResponse(
          AUTH_MESSAGES.resetTokenInvalid,
          'invalid_token'
        )
      }

      return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
    }

    // 3. Success
    revalidatePath('/', 'layout')

    return createSuccessResponse(AUTH_MESSAGES.resetSuccess, {
      redirectTo: '/login',
    })
  } catch (error) {
    console.error('[Auth] Reset password error:', error)
    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}

/**
 * Reset password (programmatic)
 */
export async function resetPasswordAndRedirect(input: ResetPasswordInput): Promise<void> {
  const validationResult = resetPasswordSchema.safeParse(input)

  if (!validationResult.success) {
    throw new Error(AUTH_MESSAGES.validationError)
  }

  const { password } = validationResult.data

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    throw new Error(AUTH_MESSAGES.resetTokenInvalid)
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

// =============================================================================
// UPDATE PASSWORD ACTION
// =============================================================================

/**
 * Update Password Server Action
 *
 * Allows authenticated users to change their password.
 * Requires current password verification.
 *
 * @param _prevState - Previous form state
 * @param formData - Form data with current and new passwords
 * @returns AuthActionResponse with success/failure status
 */
export async function updatePassword(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Validate input
    const rawInput = {
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    }

    const validationResult = updatePasswordSchema.safeParse(rawInput)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? AUTH_MESSAGES.validationError,
        'validation_error'
      )
    }

    const { currentPassword, newPassword } = validationResult.data

    // 2. Get current user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
    }

    // 3. Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return createErrorResponse(
        AUTH_MESSAGES.currentPasswordWrong,
        'invalid_credentials'
      )
    }

    // 4. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
    }

    return createSuccessResponse(AUTH_MESSAGES.passwordUpdateSuccess)
  } catch (error) {
    console.error('[Auth] Update password error:', error)
    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}

// =============================================================================
// EMAIL VERIFICATION ACTION
// =============================================================================

/**
 * Verify Email Server Action
 *
 * Handles email verification tokens from Supabase auth callbacks.
 * This is typically called automatically when users click verification links.
 *
 * @param _prevState - Previous form state
 * @param formData - Form data containing token and type
 * @returns AuthActionResponse with success/failure status
 */
export async function verifyEmail(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  try {
    // 1. Validate input
    const rawInput = {
      token: formData.get('token'),
      type: formData.get('type') || undefined,
    }

    const validationResult = emailVerificationSchema.safeParse(rawInput)

    if (!validationResult.success) {
      return createErrorResponse(
        AUTH_MESSAGES.verificationTokenInvalid,
        'invalid_token'
      )
    }

    const { token, type } = validationResult.data

    // 2. Verify token with Supabase
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type ?? 'signup',
    })

    if (error) {
      return createErrorResponse(
        AUTH_MESSAGES.verificationFailed,
        'invalid_token'
      )
    }

    // 3. Success
    revalidatePath('/', 'layout')

    return createSuccessResponse(AUTH_MESSAGES.verificationSuccess, {
      redirectTo: '/dashboard',
    })
  } catch (error) {
    console.error('[Auth] Email verification error:', error)
    return createErrorResponse(AUTH_MESSAGES.verificationFailed, 'invalid_token')
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  email: string
): Promise<AuthActionResponse> {
  try {
    const headersList = await headers()
    const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    // Add delay and return success regardless (prevents enumeration)
    await addResponseDelay()

    if (error) {
      console.error('[Auth] Resend verification error:', error)
    }

    return createSuccessResponse(AUTH_MESSAGES.registerEmailSent)
  } catch (error) {
    console.error('[Auth] Resend verification error:', error)
    await addResponseDelay()
    return createSuccessResponse(AUTH_MESSAGES.registerEmailSent)
  }
}

// =============================================================================
// GET CURRENT USER
// =============================================================================

/**
 * Get the currently authenticated user
 *
 * Uses getUser() instead of getSession() for security
 * (validates token with Supabase server)
 *
 * @returns The current user or null
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 *
 * @returns boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

// =============================================================================
// OAUTH ACTIONS (Placeholder for future implementation)
// =============================================================================

/**
 * Sign in with OAuth provider
 *
 * @param provider - OAuth provider name
 */
export async function signInWithOAuth(
  provider: 'google' | 'github' | 'apple'
): Promise<AuthActionResponse> {
  try {
    const headersList = await headers()
    const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
    }

    if (data.url) {
      return createSuccessResponse('Yönlendiriliyorsunuz...', {
        redirectTo: data.url,
      })
    }

    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  } catch (error) {
    console.error('[Auth] OAuth error:', error)
    return createErrorResponse(AUTH_MESSAGES.serverError, 'server_error')
  }
}
