'use server'

/**
 * Analytics Server Actions
 *
 * Server actions for fetching analytics and statistics data.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Get order statistics for a date range
 */
export async function fetchOrderStatistics(
  organizationId: string,
  dateFrom: string,
  dateTo: string
) {
  try {
    const supabase = await createClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_type, status, total_amount')
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled') // İptal edilen siparişleri hariç tut
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)

    if (error) {
      throw new Error(`Veritabanı hatası: ${error.message}`)
    }

    const stats = {
      totalOrders: orders?.length ?? 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      ordersByType: {} as Record<string, number>,
      ordersByStatus: {} as Record<string, number>,
    }

    for (const order of orders ?? []) {
      const amount = typeof order.total_amount === 'number' 
        ? order.total_amount 
        : parseFloat(String(order.total_amount)) || 0
      
      stats.totalRevenue += amount

      if (order.status === 'completed') {
        stats.completedOrders++
      } else if (order.status === 'cancelled') {
        stats.cancelledOrders++
      }

      stats.ordersByType[order.order_type] = (stats.ordersByType[order.order_type] ?? 0) + 1
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] ?? 0) + 1
    }

    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders
    }

    return stats
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu'
    throw new Error(`Analitik verileri alınamadı: ${message}`)
  }
}

