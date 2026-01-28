'use client'

/**
 * Reset Password Page
 *
 * Implements a mobile-first password reset confirmation form with:
 * - New password input with strength indicator
 * - Password confirmation
 * - Client-side validation with Zod
 * - Server action integration
 * - Touch-friendly input sizes (48px minimum)
 * - Accessible form with proper labels and error messages
 * - Turkish language UI
 * - Token validation via Supabase auth callback
 *
 * Flow:
 * 1. User clicks reset link from email
 * 2. Supabase auth callback validates token and creates session
 * 3. User is redirected to this page with active session
 * 4. User enters new password
 * 5. Password is updated and user is redirected to login
 *
 * @see Auth Security & Rate Limiting Talimatnamesi.md
 * @see MOBILE-FIRST-TALIMATNAME-v3.md
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
  AUTH_ERROR_MESSAGES,
  checkPasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
} from '@/lib/validations/auth'
import { resetPassword, type AuthActionResponse } from '@/lib/actions/auth'
import { cn } from '@/lib/utils/cn'

/**
 * Loading spinner component for button states
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Eye icon for password visibility toggle
 */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

/**
 * Check icon for success state
 */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-500"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/**
 * Password strength indicator component
 */
function PasswordStrengthIndicator({
  password,
}: {
  password: string
}) {
  if (!password) return null

  const { strength, score, feedback } = checkPasswordStrength(password)
  const strengthColor = getPasswordStrengthColor(strength)
  const strengthLabel = getPasswordStrengthLabel(strength)

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index < score ? strengthColor : 'bg-muted'
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            'text-xs font-medium',
            strength === 'weak' && 'text-red-500',
            strength === 'fair' && 'text-orange-500',
            strength === 'good' && 'text-yellow-600',
            strength === 'strong' && 'text-green-500'
          )}
        >
          {strengthLabel}
        </span>
      </div>

      {/* Feedback messages */}
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-muted-foreground">&#8226;</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // Watch password for strength indicator
  const password = watch('password')

  // Focus first field on mount for better UX
  React.useEffect(() => {
    setFocus('password')
  }, [setFocus])

  /**
   * Handle form submission
   * Uses server action for password reset
   */
  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      // Create FormData for server action
      const formData = new FormData()
      formData.append('password', data.password)
      formData.append('confirmPassword', data.confirmPassword)

      // Call server action
      const result: AuthActionResponse = await resetPassword(null, formData)

      if (result.success) {
        setIsSuccess(true)
        // Auto redirect after showing success message
        setTimeout(() => {
          router.push(result.redirectTo || '/login')
        }, 3000)
      } else {
        // Show error message
        setServerError(result.message || AUTH_ERROR_MESSAGES.invalidInput)
      }
    } catch {
      setServerError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="border-0 shadow-lg md:border md:shadow-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <CheckIcon />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sifre Guncellendi
          </CardTitle>
          <CardDescription className="text-base">
            Sifreniz basariyla guncellendi. Giris sayfasina yonlendiriliyorsunuz...
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-12 text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Giris Yap
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Default state - form
  return (
    <Card className="border-0 shadow-lg md:border md:shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Yeni Sifre Belirle</CardTitle>
        <CardDescription>
          Hesabiniz icin yeni bir sifre belirleyin
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {/* Server error message */}
          {serverError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              <p className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </p>
            </div>
          )}

          {/* Token expired info */}
          {serverError?.includes('gecersiz') || serverError?.includes('suresi') ? (
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              <p>
                Sifre sifirlama linkinin suresi dolmus olabilir.{' '}
                <Link
                  href="/forgot-password"
                  className="font-medium text-primary-600 hover:underline"
                >
                  Yeni bir link isteyin
                </Link>
              </p>
            </div>
          ) : null}

          {/* New Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Yeni Sifre</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={
                  errors.password
                    ? 'password-error'
                    : 'password-strength'
                }
                className={cn(
                  'h-12 pr-12 text-base',
                  errors.password && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target flex items-center justify-center"
                aria-label={showPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.password.message}
              </p>
            )}
            {/* Password strength indicator */}
            <div id="password-strength">
              <PasswordStrengthIndicator password={password || ''} />
            </div>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Sifre Tekrar</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Sifreyi tekrar girin"
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                className={cn(
                  'h-12 pr-12 text-base',
                  errors.confirmPassword && 'border-destructive focus-visible:ring-destructive'
                )}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target flex items-center justify-center"
                aria-label={showConfirmPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* Submit button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                <span>Guncelleniyor...</span>
              </>
            ) : (
              'Sifreyi Guncelle'
            )}
          </Button>

          {/* Back to login link */}
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Giris sayfasina don
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
