'use client'

/**
 * Forgot Password Page
 *
 * Implements a mobile-first password reset request form with:
 * - Email input for reset link request
 * - Client-side validation with Zod
 * - Server action integration
 * - Touch-friendly input sizes (48px minimum)
 * - Accessible form with proper labels and error messages
 * - Turkish language UI
 * - Account enumeration protection (always shows success message)
 *
 * @see Auth Security & Rate Limiting Talimatnamesi.md
 * @see MOBILE-FIRST-TALIMATNAME-v3.md
 */

import * as React from 'react'
import Link from 'next/link'
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
  forgotPasswordSchema,
  type ForgotPasswordInput,
  AUTH_ERROR_MESSAGES,
} from '@/lib/validations/auth'
import { forgotPassword, type AuthActionResponse } from '@/lib/actions/auth'
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
 * Mail icon for success state
 */
function MailIcon() {
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
      className="text-primary-600"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [submittedEmail, setSubmittedEmail] = React.useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  // Focus email input on mount for better UX
  React.useEffect(() => {
    setFocus('email')
  }, [setFocus])

  /**
   * Handle form submission
   * Uses server action for password reset request
   */
  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      // Create FormData for server action
      const formData = new FormData()
      formData.append('email', data.email)

      // Call server action
      const result: AuthActionResponse = await forgotPassword(null, formData)

      if (result.success) {
        // Always show success (prevents account enumeration)
        setSubmittedEmail(data.email)
        setIsSuccess(true)
      } else {
        // Show error message (validation errors only)
        setServerError(result.message || AUTH_ERROR_MESSAGES.invalidInput)
      }
    } catch {
      setServerError('Bir hata olustu. Lutfen tekrar deneyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state - email sent
  if (isSuccess) {
    return (
      <Card className="border-0 shadow-lg md:border md:shadow-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <MailIcon />
          </div>
          <CardTitle className="text-2xl font-bold">
            E-posta Gonderildi
          </CardTitle>
          <CardDescription className="text-base">
            Eger <span className="font-medium text-foreground">{submittedEmail}</span> adresi kayitliysa, sifre sifirlama linki gonderildi.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Info message */}
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Not:</strong> E-posta birka&ccedil; dakika i&ccedil;inde gelmezse:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Spam/gereksiz klasorunu kontrol edin</li>
              <li>E-posta adresini dogru girdiginizden emin olun</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* Back to login link */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-12 text-base font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Giris Sayfasina Don
          </Link>

          {/* Try again button */}
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false)
              setSubmittedEmail('')
            }}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            Farkli bir e-posta adresi dene
          </button>
        </CardFooter>
      </Card>
    )
  }

  // Default state - form
  return (
    <Card className="border-0 shadow-lg md:border md:shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Sifremi Unuttum</CardTitle>
        <CardDescription>
          E-posta adresinizi girin, size sifre sifirlama linki gonderelim
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

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              autoComplete="email"
              inputMode="email"
              disabled={isSubmitting}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={cn(
                'h-12 text-base',
                errors.email && 'border-destructive focus-visible:ring-destructive'
              )}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.email.message}
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
                <span>Gonderiliyor...</span>
              </>
            ) : (
              'Sifirlama Linki Gonder'
            )}
          </Button>

          {/* Back to login link */}
          <p className="text-center text-sm text-muted-foreground">
            Sifrenizi hatirladi misiniz?{' '}
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Giris yapin
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
