import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import FundCard from '@/components/shared/FundCard'

const SORT_OPTIONS = [
  { value: '', label: 'Podrazumevano' },
  { value: 'fundValue', label: 'Vrednost' },
  { value: 'profit', label: 'Profit' },
  { value: 'minimumContribution', label: 'Min. uplata' },
]

export default function FundsDiscoveryPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const { funds, fundsLoading, fundsError, fetchFunds } = useCelina4Store()

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('')

  const isSupervisor = (user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN') && hasPermission('SUPERVISOR')

  useEffect(() => {
    fetchFunds()
  }, [fetchFunds])

  function handleSearch() {
    fetchFunds({ name: search.trim() || undefined, sortBy: sortBy || undefined })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  const displayFunds = funds

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Investicioni fondovi</h1>
        {isSupervisor && (
          <button
            onClick={() => navigate('/funds/create')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Kreiraj fond
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Pretraži po nazivu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Pretraži
        </button>
      </div>

      {fundsLoading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {fundsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fundsError}
        </div>
      )}

      {!fundsLoading && !fundsError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayFunds.length === 0 ? (
            <p className="col-span-full py-16 text-center text-gray-400">Nema fondova.</p>
          ) : (
            displayFunds.map(fund => (
              <FundCard
                key={fund.id}
                fund={fund}
                onClick={() => navigate(`/funds/${fund.id}`)}
                showInvestButton={!isSupervisor}
                onInvest={() => navigate(`/funds/${fund.id}/invest`)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
