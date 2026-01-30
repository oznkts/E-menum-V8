'use client'

export const dynamic = 'force-dynamic'

/**
 * Email Verification Page
 *
 * Displays a confirmation message after registration, instructing the user
 * to check their email for a verification link.
 *
 * Features:
 * - Shows the email address the verification was sent to
 * - Resend verification email functionality
 * - Mobile-first responsive design
 * - Turkish language UI
 * - Accessible with proper ARIA attributes
 *
 * @see MOBILE-FIRST-TALIMATNAME-v3.md
 */

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { resendVerificationEmail, type AuthActionResponse } from '@/lib/actions/auth'
import { cn } from '@/lib/utils/cn'

/**
 * Loading spinner component
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
 * Mail icon component
 */
function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

/**
 * Check circle icon component
 */
function CheckCircleIcon({ className }: { className?: string }) {
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
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const [isResending, setIsResending] = React.useState(false)
  const [resendStatus, setResendStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [cooldown, setCooldown] = React.useState(0)

  // Handle cooldown timer
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  /**
   * Handle resend verification email
   */
  const handleResend = async () => {
    if (!email || isResending || cooldown > 0) return

    setIsResending(true)
    setResendStatus('idle')

    try {
      const result: AuthActionResponse = await resendVerificationEmail(email)

      if (result.success) {
        setResendStatus('success')
        setCooldown(60) // 60 second cooldown
      } else {
        setResendStatus('error')
      }
    } catch {
      setResendStatus('error')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="border-0 shadow-lg md:border md:shadow-md">
      <CardHeader className="space-y-4 text-center pb-2">
        {/* Email icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary-50 p-4 dark:bg-primary-950">
            <MailIcon className="text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold">E-postanizi Dogrulayin</CardTitle>
          <CardDescription className="text-base">
            Hesabinizi aktif etmek icin e-postanizi dogrulayin
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-center">
        {/* Email address display */}
        {email && (
          <p className="text-sm">
            Dogrulama linki su adrese gonderildi:
            <br />
            <strong className="text-foreground">{email}</strong>
          </p>
        )}

        {/* Instructions */}
        <div className="rounded-md bg-muted/50 p-4 text-left space-y-2">
          <p className="text-sm text-muted-foreground">
            Lutfen su adimlari takip edin:
          </p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>E-posta kutunuzu kontrol edin</li>
            <li>Spam/gereksiz klasorunu de kontrol edin</li>
            <li>Dogrulama linkine tiklayin</li>
          </ol>
        </div>

        {/* Resend success message */}
        {resendStatus === 'success' && (
          <div
            role="alert"
            className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300"
          >
            <p className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="text-green-600 dark:text-green-400" />
              Dogrulama e-postasi tekrar gonderildi
            </p>
          </div>
        )}

        {/* Resend error message */}
        {resendStatus === 'error' && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p className="flex items-center justify-center gap-2">
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
              Bir hata olustu. Lutfen tekrar deneyin.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        {/* Resend button */}
        {email && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
          >
            {isResending ? (
              <>
                <LoadingSpinner />
                <span>Gonderiliyor...</span>
              </>
            ) : cooldown > 0 ? (
              `Tekrar gonder (${cooldown}s)`
            ) : (
              'E-postayi Tekrar Gonder'
            )}
          </Button>
        )}

        {/* Back to login */}
        <p className="text-center text-sm text-muted-foreground">
          Yanlis e-posta mi?{' '}
          <Link
            href="/register"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            Tekrar kayit olun
          </Link>
        </p>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          Zaten dogruladiniz mi?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            Giris yapin
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg md:border md:shadow-md">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary-50 p-4 dark:bg-primary-950">
                <MailIcon className="text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Yükleniyor...</CardTitle>
            </div>
          </CardHeader>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
