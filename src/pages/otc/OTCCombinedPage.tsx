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

export default function OTCCombinedPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('offers')
  const [contractFilter, setContractFilter] = useState<ContractFilter>('all')

  const {
    offers, offersLoading, offersError, fetchOffers,
    contracts, contractsLoading, fetchContracts,
    executeContract,
  } = useCelina4Store()

  useEffect(() => { fetchOffers() }, [fetchOffers])
  useEffect(() => { fetchContracts() }, [fetchContracts])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">OTC Ponude i Ugovori</h1>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {([['offers', 'Ponude'], ['contracts', 'Ugovori']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Ponude tab ── */}
      {tab === 'offers' && (
        <>
          {offersLoading && (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          )}
          {offersError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {offersError}
            </div>
          )}
          {!offersLoading && !offersError && (
            <OTCTradeTable
              offers={offers}
              onView={id => navigate(`/otc/offers/${id}`)}
            />
          )}
        </>
      )}

      {/* ── Ugovori tab ── */}
      {tab === 'contracts' && (
        <>
          <div className="mb-4 flex justify-end gap-1 rounded-lg border border-gray-200 p-0.5 w-fit ml-auto">
            {CONTRACT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setContractFilter(f.key)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  contractFilter === f.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {contractsLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <OTCContractTable
              contracts={contracts}
              filter={contractFilter}
              onExecute={id => executeContract(id)}
              onView={id => navigate(`/otc/contracts/${id}`)}
            />
          )}
        </>
      )}

      <SAGAStatusToast />
    </div>
  )
}
