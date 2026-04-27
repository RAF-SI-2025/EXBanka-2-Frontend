import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import OTCContractTable from '@/components/otc/OTCContractTable'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

type Filter = 'all' | 'valid' | 'expired'

const FILTER_OPTS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Svi' },
  { key: 'valid', label: 'Važeći' },
  { key: 'expired', label: 'Istekli' },
]

export default function OTCContractsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const { contracts, contractsLoading, fetchContracts, executeContract } = useCelina4Store()

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate(-1)}>← Nazad</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">OTC Ugovori</h1>

        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
          {FILTER_OPTS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                filter === opt.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {contractsLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <OTCContractTable
          contracts={contracts}
          filter={filter}
          onExecute={id => executeContract(id)}
          onView={id => navigate(`/otc/contracts/${id}`)}
        />
      )}

      <SAGAStatusToast />
    </div>
  )
}
