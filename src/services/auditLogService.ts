import { apiGet } from './grpcClient'
import type { AuditLogEntry } from '@/types'

export interface AuditLogFilter {
  action?: string
  actorId?: number
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface AuditLogResponse {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export async function listAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogResponse> {
  const params = new URLSearchParams()
  if (filter.action) params.set('action', filter.action)
  if (filter.actorId != null) params.set('actor_id', String(filter.actorId))
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  if (filter.page != null) params.set('page', String(filter.page))
  if (filter.pageSize != null) params.set('page_size', String(filter.pageSize))
  const qs = params.toString()
  const res = await apiGet<{ entries: AuditLogEntry[] | null; total: number; page: number; pageSize: number }>(
    `/bank/audit-log${qs ? `?${qs}` : ''}`
  )
  return {
    entries: res.entries ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pageSize: res.pageSize ?? 50,
  }
}
