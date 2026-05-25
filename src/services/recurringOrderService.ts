import { apiDelete, apiGet, apiPatch, apiPost } from './grpcClient'
import type { RecurringOrder, CreateRecurringOrderRequest } from '@/types'

export async function listRecurringOrders(): Promise<RecurringOrder[]> {
  const res = await apiGet<{ recurringOrders: RecurringOrder[] | null }>('/bank/recurring-orders')
  return res.recurringOrders ?? []
}

export async function createRecurringOrder(req: CreateRecurringOrderRequest): Promise<RecurringOrder> {
  return apiPost<CreateRecurringOrderRequest, RecurringOrder>('/bank/recurring-orders', req)
}

export async function pauseRecurringOrder(id: number): Promise<RecurringOrder> {
  return apiPatch<{ active: boolean }, RecurringOrder>(`/bank/recurring-orders/${id}`, { active: false })
}

export async function resumeRecurringOrder(id: number): Promise<RecurringOrder> {
  return apiPatch<{ active: boolean }, RecurringOrder>(`/bank/recurring-orders/${id}`, { active: true })
}

export async function deleteRecurringOrder(id: number): Promise<void> {
  await apiDelete(`/bank/recurring-orders/${id}`)
}
