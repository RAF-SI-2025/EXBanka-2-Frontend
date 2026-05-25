/**
 * Price Alert API service.
 * Endpoints: /bank/price-alerts
 */

import { apiDelete, apiGet, apiPost } from './grpcClient'
import type { CreatePriceAlertRequest, PriceAlert } from '@/types'

export async function listPriceAlerts(): Promise<PriceAlert[]> {
  const res = await apiGet<{ alerts: PriceAlert[] | null }>('/bank/price-alerts')
  return res.alerts ?? []
}

export async function createPriceAlert(req: CreatePriceAlertRequest): Promise<PriceAlert> {
  return apiPost<CreatePriceAlertRequest, PriceAlert>('/bank/price-alerts', req)
}

export async function deletePriceAlert(id: number): Promise<void> {
  await apiDelete(`/bank/price-alerts/${id}`)
}
