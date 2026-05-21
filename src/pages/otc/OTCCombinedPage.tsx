import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import OTCTradeTable from '@/components/otc/OTCTradeTable'
import OTCContractTable from '@/components/otc/OTCContractTable'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

type Tab = 'offers' | 'contracts'
type ContractFilter = 'all' | 'valid' | 'expired'

const CONTRACT_FILTERS: { key: ContractFilter; label: string }[] = [
  { key: 'all', label: 'Svi' },
  { key: 'valid', label: 'Važeći' },
  { key: 'expired', label: 'Istekli' },
]

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-6 py-3.5 text-center ring-1 ring-white/20">
      <div className="text-3xl font-bold tabular-nums text-white"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">{label}</div>
    </div>
  )
}

export default function OTCCombinedPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('offers')
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all')

  const {
    offers, offersLoading, offersError, fetchOffers,
    contracts, contractsLoading, fetchContracts,
    executeContract, unreadCount,
  } = useCelina4Store()

  useEffect(() => { fetchOffers() }, [fetchOffers])
  useEffect(() => { fetchContracts() }, [fetchContracts])

  const isLoading = tab === 'offers' ? offersLoading : contractsLoading

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300">
                Over-The-Counter · Upravljanje pozicijama
              </p>
              <h1 className="text-[2.6rem] font-bold leading-tight tracking-tight text-white">
                Ponude &amp; Ugovori
              </h1>
              <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                Pregled i upravljanje vašim OTC ponudama i ugovorima.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 sm:items-end">
              <button
                onClick={() => navigate('/otc/trade')}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
              >
                + Nova ponuda
              </button>
              <div className="flex gap-4">
                <StatCard label="Ponude" value={offers.length} />
                <StatCard label="Ugovori" value={contracts.length} />
              </div>
            </div>
          </div>

          {/* Tab switcher inside header */}
          <div className="mt-7 flex w-fit gap-1 rounded-xl bg-white/10 p-1">
            {([['offers', 'Ponude'], ['contracts', 'Ugovori']] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
                {key === 'offers' && unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        {/* Contract filter */}
        {tab === 'contracts' && (
          <div className="mb-5 flex w-fit gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {CONTRACT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setContractFilter(f.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  contractFilter === f.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {tab === 'offers' && offersError && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {offersError}
          </div>
        )}

        {/* Skeleton loading */}
        {isLoading && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div
                          className="h-4 animate-pulse rounded-md bg-gray-100"
                          style={{ width: [60, 120, 80, 80, 70, 90, 70, 80][j] }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Content */}
        {tab === 'offers' && !offersLoading && !offersError && (
          <OTCTradeTable offers={offers} onView={id => navigate(`/otc/offers/${id}`)} />
        )}
        {tab === 'contracts' && !contractsLoading && (
          <OTCContractTable
            contracts={contracts}
            filter={contractFilter}
            onExecute={id => executeContract(id)}
            onView={id => navigate(`/otc/contracts/${id}`)}
          />
        )}
      </div>

      <SAGAStatusToast />
    </div>
  )
}
