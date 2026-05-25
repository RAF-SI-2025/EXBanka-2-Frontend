import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ClipboardList, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getHomeForRole } from '@/router/helpers'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { listAuditLog } from '@/services/auditLogService'
import type { AuditLogEntry } from '@/types'

const ALL_ACTIONS = [
  'ORDER_APPROVED',
  'ORDER_DECLINED',
  'ORDER_CANCELED',
  'AGENT_LIMIT_SET',
  'AGENT_LIMIT_RESET',
  'ACTUARY_CREATED',
  'ACTUARY_DELETED',
  'TAX_CALCULATED',
  'PERMISSION_CHANGED',
] as const

const ACTION_BADGE: Record<string, string> = {
  ORDER_APPROVED:     'bg-green-100 text-green-800',
  ORDER_DECLINED:     'bg-red-100 text-red-800',
  ORDER_CANCELED:     'bg-orange-100 text-orange-800',
  AGENT_LIMIT_SET:    'bg-blue-100 text-blue-800',
  AGENT_LIMIT_RESET:  'bg-purple-100 text-purple-800',
  ACTUARY_CREATED:    'bg-green-100 text-green-800',
  ACTUARY_DELETED:    'bg-red-100 text-red-800',
  TAX_CALCULATED:     'bg-yellow-100 text-yellow-800',
  PERMISSION_CHANGED: 'bg-purple-100 text-purple-800',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_BADGE[action] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details)
  if (entries.length === 0) return <span className="text-gray-400">—</span>
  return (
    <span className="font-mono text-xs text-gray-600 whitespace-pre-wrap break-all">
      {entries.map(([k, v]) => `${k}: ${v}`).join('\n')}
    </span>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm text-gray-800 align-top ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  )
}

const PAGE_SIZE = 50

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [actionFilter, setActionFilter] = useState('')
  const [actorIdFilter, setActorIdFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const parsed = Number(actorIdFilter.trim())
    const actorId = actorIdFilter.trim() && !isNaN(parsed) ? parsed : undefined
    listAuditLog({
      action: actionFilter || undefined,
      actorId,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (!cancelled) {
          setEntries(res.entries)
          setTotal(res.total)
        }
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [actionFilter, actorIdFilter, fromFilter, toFilter, page])

  function clearFilters() {
    setActionFilter('')
    setActorIdFilter('')
    setFromFilter('')
    setToFilter('')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!(actionFilter || actorIdFilter || fromFilter || toFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">Sistemske akcije zaposlenih i agenata</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
            showFilters || hasFilters
              ? 'bg-primary-50 text-primary-700 border-primary-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
          ].join(' ')}
        >
          <Filter className="h-4 w-4" />
          Filteri
          {hasFilters && (
            <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-white text-xs">
              !
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tip akcije</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Sve akcije</option>
                {ALL_ACTIONS.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ID aktera</label>
              <input
                type="number"
                placeholder="npr. 42"
                value={actorIdFilter}
                onChange={(e) => { setActorIdFilter(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Od datuma</label>
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => { setFromFilter(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Do datuma</label>
              <input
                type="date"
                value={toFilter}
                onChange={(e) => { setToFilter(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-800 underline"
              >
                Ukloni filtere
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            {hasFilters ? 'Nema zapisa za odabrane filtere.' : 'Nema audit log zapisa.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <Th>ID</Th>
                  <Th>Akcija</Th>
                  <Th>Akter ID</Th>
                  <Th>Cilj ID</Th>
                  <Th>Detalji</Th>
                  <Th>Vreme</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <Td mono>{e.id}</Td>
                    <Td><ActionBadge action={e.action} /></Td>
                    <Td mono>{e.actorId ?? '—'}</Td>
                    <Td mono>{e.targetId ?? '—'}</Td>
                    <Td><DetailsCell details={e.details} /></Td>
                    <Td mono>
                      {new Date(e.createdAt).toLocaleString('sr-RS', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Strana {page} od {totalPages} ({total} zapisa)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditLogPage() {
  const { user, hasPermission } = useAuthStore()

  const isAdmin = user?.userType === 'ADMIN'
  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')

  if (!isAdmin && !isSupervisor) {
    return <Navigate to={getHomeForRole(user?.userType)} replace />
  }

  return <AuditLogContent />
}
