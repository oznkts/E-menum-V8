'use server'

/**
 * Service Requests Server Actions
 *
 * Dedicated Server Actions for service request operations:
 * - Waiter call / bell ring from customers
 * - Bill requests
 * - Help requests
 * - Feedback and complaints
 *
 * Features:
 * - Rate limiting (3 requests per table in 5 minutes)
 * - Staff notification via realtime
 * - Turkish error messages
 * - Standardized response format
 *
 * @module lib/actions/service-requests
 * @see ek_ozellikler.md for service request requirements
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createServiceRequestSchema,
  type CreateServiceRequestInput,
  SERVICE_REQUEST_TYPE_LABELS,
} from '@/lib/validations/orders'
import type { ServiceRequest, ServiceRequestType, ServiceRequestStatus } from '@/types/database'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard action response for service request operations
 */
export interface ServiceRequestActionResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
  errorCode?: ServiceRequestErrorCode
}

/**
 * Service request error codes
 */
export type ServiceRequestErrorCode =
  | 'not_found'
  | 'validation_error'
  | 'permission_denied'
  | 'database_error'
  | 'rate_limited'
  | 'unknown_error'

/**
 * Turkish messages for service request actions
 */
const SERVICE_REQUEST_MESSAGES = {
  // Success messages
  waiterCallCreated: 'Garson çağrınız alındı. Personelimiz kısa sürede yanınızda olacak.',
  billRequestCreated: 'Hesap talebiniz alındı. Personelimiz hesabınızı hazırlayacak.',
  helpRequestCreated: 'Yardım talebiniz alındı. Personelimiz size yardımcı olacak.',
  feedbackCreated: 'Geri bildiriminiz için teşekkür ederiz.',
  complaintCreated: 'Şikayetiniz alındı. En kısa sürede değerlendireceğiz.',
  requestAcknowledged: 'İsteğiniz görüldü.',
  requestCompleted: 'İsteğiniz tamamlandı.',

  // Error messages
  rateLimited: 'Lütfen birkaç dakika bekleyin ve tekrar deneyin.',
  tableNotFound: 'Masa bilgisi bulunamadı.',
  organizationNotFound: 'Restoran bilgisi bulunamadı.',
  validationError: 'Girilen bilgiler geçersiz.',
  serverError: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  permissionDenied: 'Bu işlem için yetkiniz yok.',
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get success message based on request type
 */
function getSuccessMessage(requestType: ServiceRequestType): string {
  switch (requestType) {
    case 'call_waiter':
      return SERVICE_REQUEST_MESSAGES.waiterCallCreated
    case 'request_bill':
      return SERVICE_REQUEST_MESSAGES.billRequestCreated
    case 'need_help':
      return SERVICE_REQUEST_MESSAGES.helpRequestCreated
    case 'feedback':
      return SERVICE_REQUEST_MESSAGES.feedbackCreated
    case 'complaint':
      return SERVICE_REQUEST_MESSAGES.complaintCreated
    default:
      return SERVICE_REQUEST_MESSAGES.waiterCallCreated
  }
}

/**
 * Create a standardized error response
 */
function createErrorResponse<T>(
  message: string,
  errorCode: ServiceRequestErrorCode,
  details?: string
): ServiceRequestActionResponse<T> {
  return {
    success: false,
    message,
    errorCode,
    error: details,
  }
}

/**
 * Create a standardized success response
 */
function createSuccessResponse<T>(
  message: string,
  data?: T
): ServiceRequestActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

// =============================================================================
// SERVICE REQUEST ACTIONS
// =============================================================================

/**
 * Call Waiter Server Action
 *
 * Quick action specifically for calling a waiter.
 * This is the most common use case and has a simplified interface.
 *
 * @param tableId - The table UUID
 * @param organizationId - The organization UUID
 * @param tableName - Optional table name for display
 * @returns ServiceRequestActionResponse with created request
 */
export async function callWaiter(
  tableId: string,
  organizationId: string,
  tableName?: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  return createServiceRequest({
    table_id: tableId,
    organization_id: organizationId,
    request_type: 'call_waiter',
    message: tableName ? `Masa: ${tableName}` : null,
  })
}

/**
 * Request Bill Server Action
 *
 * Quick action for requesting the bill.
 *
 * @param tableId - The table UUID
 * @param organizationId - The organization UUID
 * @param tableName - Optional table name for display
 * @returns ServiceRequestActionResponse with created request
 */
export async function requestBill(
  tableId: string,
  organizationId: string,
  tableName?: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  return createServiceRequest({
    table_id: tableId,
    organization_id: organizationId,
    request_type: 'request_bill',
    message: tableName ? `Masa: ${tableName}` : null,
  })
}

/**
 * Request Help Server Action
 *
 * Quick action for general help requests.
 *
 * @param tableId - The table UUID
 * @param organizationId - The organization UUID
 * @param message - Optional help message
 * @returns ServiceRequestActionResponse with created request
 */
export async function requestHelp(
  tableId: string,
  organizationId: string,
  message?: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  return createServiceRequest({
    table_id: tableId,
    organization_id: organizationId,
    request_type: 'need_help',
    message: message ?? null,
  })
}

/**
 * Create Service Request Server Action
 *
 * Creates any type of service request (waiter call, bill request, help, feedback, complaint).
 * Rate limited to prevent abuse.
 *
 * @param input - Service request creation input
 * @returns ServiceRequestActionResponse with created request
 */
export async function createServiceRequest(
  input: CreateServiceRequestInput
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  try {
    // 1. Validate input
    const validationResult = createServiceRequestSchema.safeParse(input)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return createErrorResponse(
        firstError?.message ?? SERVICE_REQUEST_MESSAGES.validationError,
        'validation_error'
      )
    }

    const validatedInput = validationResult.data

    const supabase = await createClient()

    // 2. Check rate limiting - max 3 requests per table in 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('table_id', validatedInput.table_id)
      .gte('created_at', fiveMinutesAgo)

    if (countError) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        countError.message
      )
    }

    if ((count ?? 0) >= 3) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.rateLimited,
        'rate_limited'
      )
    }

    // 3. Create service request
    const { data: request, error: insertError } = await supabase
      .from('service_requests')
      .insert({
        organization_id: validatedInput.organization_id,
        table_id: validatedInput.table_id,
        request_type: validatedInput.request_type,
        message: validatedInput.message,
        session_id: validatedInput.session_id,
        status: 'pending' as ServiceRequestStatus,
      })
      .select()
      .single()

    if (insertError) {
      // Check for rate limit constraint error
      if (
        insertError.message?.includes('rate limit') ||
        insertError.code === '23514'
      ) {
        return createErrorResponse(
          SERVICE_REQUEST_MESSAGES.rateLimited,
          'rate_limited'
        )
      }

      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        insertError.message
      )
    }

    // 4. Revalidate dashboard paths for staff to see the new request
    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    // 5. Return success with appropriate message
    const successMessage = getSuccessMessage(validatedInput.request_type)
    return createSuccessResponse(successMessage, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      SERVICE_REQUEST_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Acknowledge Service Request Server Action (Staff-facing)
 *
 * Marks a service request as acknowledged by staff.
 *
 * @param requestId - The service request UUID
 * @returns ServiceRequestActionResponse with updated request
 */
export async function acknowledgeServiceRequest(
  requestId: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  try {
    if (!requestId) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.validationError,
        'validation_error'
      )
    }

    const supabase = await createClient()

    const { data: request, error } = await supabase
      .from('service_requests')
      .update({
        status: 'acknowledged' as ServiceRequestStatus,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(
          'İstek bulunamadı',
          'not_found'
        )
      }
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        error.message
      )
    }

    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    return createSuccessResponse(SERVICE_REQUEST_MESSAGES.requestAcknowledged, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      SERVICE_REQUEST_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Complete Service Request Server Action (Staff-facing)
 *
 * Marks a service request as completed.
 *
 * @param requestId - The service request UUID
 * @param response - Optional response message
 * @returns ServiceRequestActionResponse with updated request
 */
export async function completeServiceRequest(
  requestId: string,
  response?: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  try {
    if (!requestId) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.validationError,
        'validation_error'
      )
    }

    const supabase = await createClient()

    const { data: request, error } = await supabase
      .from('service_requests')
      .update({
        status: 'completed' as ServiceRequestStatus,
        status_changed_at: new Date().toISOString(),
        handled_at: new Date().toISOString(),
        response: response ?? null,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(
          'İstek bulunamadı',
          'not_found'
        )
      }
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        error.message
      )
    }

    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    return createSuccessResponse(SERVICE_REQUEST_MESSAGES.requestCompleted, request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      SERVICE_REQUEST_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Cancel Service Request Server Action (Staff-facing)
 *
 * Cancels a service request (e.g., if customer leaves).
 *
 * @param requestId - The service request UUID
 * @returns ServiceRequestActionResponse with updated request
 */
export async function cancelServiceRequest(
  requestId: string
): Promise<ServiceRequestActionResponse<ServiceRequest>> {
  try {
    if (!requestId) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.validationError,
        'validation_error'
      )
    }

    const supabase = await createClient()

    const { data: request, error } = await supabase
      .from('service_requests')
      .update({
        status: 'cancelled' as ServiceRequestStatus,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(
          'İstek bulunamadı',
          'not_found'
        )
      }
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        error.message
      )
    }

    revalidatePath('/dashboard/service-requests')
    revalidatePath('/dashboard')

    return createSuccessResponse('İstek iptal edildi', request)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      SERVICE_REQUEST_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}

/**
 * Get Pending Service Requests Count
 *
 * Returns count of pending service requests for badge display.
 *
 * @param organizationId - The organization UUID
 * @returns Count of pending requests
 */
export async function getPendingServiceRequestsCount(
  organizationId: string
): Promise<ServiceRequestActionResponse<number>> {
  try {
    if (!organizationId) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.validationError,
        'validation_error'
      )
    }

    const supabase = await createClient()

    const { count, error } = await supabase
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending')

    if (error) {
      return createErrorResponse(
        SERVICE_REQUEST_MESSAGES.serverError,
        'database_error',
        error.message
      )
    }

    return createSuccessResponse('', count ?? 0)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return createErrorResponse(
      SERVICE_REQUEST_MESSAGES.serverError,
      'unknown_error',
      errorMessage
    )
  }
}
