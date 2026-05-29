import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import FundCard from '@/components/shared/FundCard'

const SORT_OPTIONS = [
  { value: '', label: 'Podrazumevano' },
  { value: 'fundValue', label: 'Vrednost fonda' },
  { value: 'profit', label: 'Profit' },
  { value: 'minimumContribution', label: 'Min. uplata' },
  { value: 'annualizedReturn', label: 'Godišnji prinos' },
  { value: 'rewardToVariability', label: 'Prinos/Rizik' },
  { value: 'maxDrawdown', label: 'Max drawdown' },
  { value: 'volatility', label: 'Volatilnost' },
]

export default function FundsDiscoveryPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const { funds, fundsLoading, fundsError, fetchFunds } = useCelina4Store()

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSupervisor = (user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN') && hasPermission('SUPERVISOR')

  useEffect(() => { fetchFunds() }, [fetchFunds])

  function handleSearchInput(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchFunds({ name: value.trim() || undefined, sortBy: sortBy || undefined })
    }, 400)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300">
                Kapital · Upravljanje investicijama
              </p>
              <h1 className="text-[2.6rem] font-bold leading-tight tracking-tight text-white">
                Investicioni fondovi
              </h1>
              <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                Istražite dostupne fondove i uložite kapital u skladu sa vašim ciljevima.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              {isSupervisor && (
                <button
                  onClick={() => navigate('/funds/create')}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                >
                  + Kreiraj fond
                </button>
              )}
              {!fundsLoading && (
                <div className="rounded-xl bg-white/10 px-6 py-3.5 text-center ring-1 ring-white/20">
                  <div className="text-3xl font-bold tabular-nums text-white">{funds.length}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Fondova</div>
                </div>
              )}
            </div>
          </div>

          {/* Search + sort inside header */}
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="relative flex-1" style={{ minWidth: '200px', maxWidth: '360px' }}>
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Pretraži po nazivu…"
                value={search}
                onChange={e => handleSearchInput(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-blue-200 backdrop-blur-sm focus:border-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); fetchFunds({ name: search.trim() || undefined, sortBy: e.target.value || undefined }) }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              style={{ colorScheme: 'dark' }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-blue-800 text-white">{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => fetchFunds({ name: search.trim() || undefined, sortBy: sortBy || undefined })}
              className="rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
            >
              Pretraži
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        {/* Error */}
        {fundsError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {fundsError}
          </div>
        )}

        {/* Skeleton loading */}
        {fundsLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 h-5 w-2/3 animate-pulse rounded-lg bg-gray-100" />
                <div className="mb-5 h-3 w-full animate-pulse rounded-lg bg-gray-100" />
                <div className="mb-1.5 h-3 w-4/5 animate-pulse rounded-lg bg-gray-100" />
                <div className="mb-4 h-3 w-3/5 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-9 w-full animate-pulse rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!fundsLoading && !fundsError && funds.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-500">Nema dostupnih fondova.</p>
            {search && (
              <button onClick={() => { setSearch(''); fetchFunds() }} className="mt-2 text-xs text-blue-600 hover:underline">
                Obriši pretragu
              </button>
            )}
          </div>
        )}

        {/* Fund grid */}
        {!fundsLoading && !fundsError && funds.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {funds.map(fund => (
              <FundCard
                key={fund.id}
                fund={fund}
                onClick={() => navigate(`/funds/${fund.id}`)}
                showInvestButton={!isSupervisor}
                onInvest={() => navigate(`/funds/${fund.id}/invest`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
