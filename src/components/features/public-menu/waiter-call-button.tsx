'use client'

/**
 * Waiter Call Button Component
 *
 * A floating action button for customers to call a waiter from the public menu.
 * Features:
 * - Visual cooldown timer after each call (prevents spam)
 * - Multiple request types (call waiter, request bill, need help)
 * - Expandable menu for different request types
 * - Success/error feedback with animations
 * - Server action integration for proper rate limiting
 * - Mobile-first touch-friendly design
 * - Full accessibility support (ARIA, keyboard navigation)
 *
 * Rate Limiting:
 * - Visual cooldown: 60 seconds between calls (client-side feedback)
 * - Server-side: Max 3 requests per table in 5 minutes (enforced by database)
 *
 * @example
 * ```tsx
 * <WaiterCallButton
 *   tableId="abc123"
 *   tableName="Masa 5"
 *   organizationId="org-456"
 * />
 * ```
 *
 * @see ek_ozellikler.md for waiter call requirements
 * @see src/lib/actions/service-requests.ts for server actions
 */

import { useState, useCallback, useEffect, useTransition } from 'react'
import {
  callWaiter,
  requestBill,
  requestHelp,
  type ServiceRequestActionResponse,
} from '@/lib/actions/service-requests'
import type { ServiceRequest, ServiceRequestType } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

export interface WaiterCallButtonProps {
  /** The table UUID */
  tableId: string
  /** Display name of the table */
  tableName: string
  /** The organization UUID */
  organizationId: string
  /** Whether the button is disabled */
  disabled?: boolean
  /** Callback when a request is successfully created */
  onSuccess?: (request: ServiceRequest) => void
  /** Callback when a request fails */
  onError?: (error: string) => void
}

type RequestTypeOption = {
  type: ServiceRequestType
  label: string
  icon: React.ReactNode
  description: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cooldown in seconds between calls (visual feedback) */
const COOLDOWN_SECONDS = 60

/** Request type options for the expanded menu */
const REQUEST_TYPE_OPTIONS: RequestTypeOption[] = [
  {
    type: 'call_waiter',
    label: 'Garson Cagir',
    description: 'Garson masaniza gelsin',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    type: 'request_bill',
    label: 'Hesap Iste',
    description: 'Hesabi masaniza getirin',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
        />
      </svg>
    ),
  },
  {
    type: 'need_help',
    label: 'Yardim',
    description: 'Genel yardim talebinde bulunun',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
]

// =============================================================================
// ICONS
// =============================================================================

/** Loading spinner icon */
const SpinnerIcon = () => (
  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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

/** Clock icon for cooldown */
const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

/** Bell icon for call waiter */
const BellIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
)

/** Check icon for success */
const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

/** Close icon */
const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

/** Expand icon (three dots or plus) */
const ExpandIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
)

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Waiter Call Button
 *
 * Floating action button to request waiter service.
 * Includes rate limiting to prevent spam (managed by server action).
 */
export function WaiterCallButton({
  tableId,
  tableName,
  organizationId,
  disabled = false,
  onSuccess,
  onError,
}: WaiterCallButtonProps) {
  // State
  const [isPending, startTransition] = useTransition()
  const [lastCallTime, setLastCallTime] = useState<Date | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [remainingCooldown, setRemainingCooldown] = useState(0)

  // Calculate if in cooldown
  const isInCooldown = remainingCooldown > 0

  // Update cooldown timer
  useEffect(() => {
    if (!lastCallTime) return

    const updateCooldown = () => {
      const elapsed = Math.floor((Date.now() - lastCallTime.getTime()) / 1000)
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed)
      setRemainingCooldown(remaining)

      if (remaining === 0) {
        setLastCallTime(null)
      }
    }

    updateCooldown()
    const interval = setInterval(updateCooldown, 1000)

    return () => clearInterval(interval)
  }, [lastCallTime])

  // Hide success message after delay
  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => {
        setShowSuccess(false)
        setSuccessMessage('')
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [showSuccess])

  // Hide error message after delay
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [error])

  // Close expanded menu when clicking outside
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-waiter-call-menu]')) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isExpanded])

  // Handle request submission
  const handleRequest = useCallback(
    async (requestType: ServiceRequestType) => {
      if (isPending || isInCooldown || disabled) return

      setError(null)
      setIsExpanded(false)

      startTransition(async () => {
        try {
          let result: ServiceRequestActionResponse<ServiceRequest>

          switch (requestType) {
            case 'call_waiter':
              result = await callWaiter(tableId, organizationId, tableName)
              break
            case 'request_bill':
              result = await requestBill(tableId, organizationId, tableName)
              break
            case 'need_help':
              result = await requestHelp(tableId, organizationId)
              break
            default:
              result = await callWaiter(tableId, organizationId, tableName)
          }

          if (!result.success) {
            // Handle rate limiting specifically
            if (result.errorCode === 'rate_limited') {
              setError(result.message)
            } else {
              setError(result.message || 'Bir hata olustu. Lutfen tekrar deneyin.')
            }
            onError?.(result.message || 'Error')
            return
          }

          // Success
          setLastCallTime(new Date())
          setRemainingCooldown(COOLDOWN_SECONDS)
          setSuccessMessage(result.message)
          setShowSuccess(true)
          onSuccess?.(result.data!)
        } catch {
          setError('Bir hata olustu. Lutfen tekrar deneyin.')
          onError?.('Unexpected error')
        }
      })
    },
    [isPending, isInCooldown, disabled, tableId, organizationId, tableName, onSuccess, onError]
  )

  // Quick call waiter action (main button)
  const handleCallWaiter = useCallback(() => {
    handleRequest('call_waiter')
  }, [handleRequest])

  // Toggle expanded menu
  const toggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  return (
    <>
      {/* Floating Action Button Container */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pb-safe pr-safe"
        data-waiter-call-menu
      >
        {/* Error Message */}
        {error && (
          <div
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2"
            role="status"
            aria-live="polite"
          >
            <span className="flex items-center gap-2">
              <CheckIcon />
              {successMessage || 'Garson cagrildi!'}
            </span>
          </div>
        )}

        {/* Expanded Menu */}
        {isExpanded && !isPending && !isInCooldown && (
          <div
            className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4"
            role="menu"
            aria-label="Hizmet secenekleri"
          >
            {REQUEST_TYPE_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleRequest(option.type)}
                disabled={disabled}
                role="menuitem"
                className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg transition-all hover:bg-gray-50 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                aria-label={option.label}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                  {option.icon}
                </span>
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main Button Row */}
        <div className="flex items-center gap-2">
          {/* Expand Button (when not in cooldown) */}
          {!isInCooldown && !isPending && (
            <button
              onClick={toggleExpanded}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-md transition-all hover:bg-gray-200 active:scale-95 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              aria-label={isExpanded ? 'Menuyu kapat' : 'Diger secenekler'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <CloseIcon /> : <ExpandIcon />}
            </button>
          )}

          {/* Main Call Waiter Button */}
          <button
            onClick={handleCallWaiter}
            disabled={isPending || isInCooldown || disabled}
            className={`
              flex min-w-[140px] items-center justify-center gap-2 rounded-full px-6 py-3
              font-medium shadow-lg transition-all active:scale-95
              ${
                isPending || isInCooldown
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
              }
            `}
            aria-label="Garson Cagir"
            aria-busy={isPending}
            aria-disabled={isPending || isInCooldown || disabled}
          >
            {isPending ? (
              <>
                <SpinnerIcon />
                <span>Cagriliyor...</span>
              </>
            ) : isInCooldown ? (
              <>
                <ClockIcon />
                <span>{remainingCooldown}s</span>
              </>
            ) : (
              <>
                <BellIcon />
                <span>Garson Cagir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default WaiterCallButton
