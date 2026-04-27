import type { OTCContract } from '@/types/celina4'

interface OTCContractTableProps {
  contracts: OTCContract[]
  onExecute: (id: string) => void
  onView: (id: string) => void
  filter: 'valid' | 'expired' | 'all'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtRSD(v: number) {
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 2 }).format(v)
}

const STATUS_LABELS: Record<OTCContract['status'], string> = {
  VALID: 'Važeći',
  EXPIRED: 'Istekao',
  EXERCISED: 'Iskorišćen',
}

export default function OTCContractTable({ contracts, onExecute, onView, filter }: OTCContractTableProps) {
  const visible = contracts.filter(c => {
    if (filter === 'all') return true
    if (filter === 'valid') return c.status === 'VALID'
    return c.status === 'EXPIRED' || c.status === 'EXERCISED'
  })

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Akcija', 'Količina', 'Strike cena', 'Premija', 'Poravnanje', 'Prodavac', 'Profit', 'Status', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visible.length === 0 && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-gray-400">
                Nema ugovora.
              </td>
            </tr>
          )}
          {visible.map(c => {
            const currentPrice = c.stock.lastKnownMarketPrice ?? c.strikePrice
            const profit = (c.amount * currentPrice) - (c.amount * c.strikePrice) - c.premium
            const settlementPassed = new Date(c.settlementDate) < new Date()
            const canExecute = c.status === 'VALID' && !settlementPassed

            return (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.stock.ticker}
                  <span className="ml-1 text-xs text-gray-500">({c.stock.exchange})</span>
                </td>
                <td className="px-4 py-3 text-gray-700">{c.amount.toLocaleString('sr-RS')}</td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(c.strikePrice)}</td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(c.premium)}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(c.settlementDate)}</td>
                <td className="px-4 py-3 text-gray-700">
                  <span className="block font-medium">{c.sellerInfo.name}</span>
                  <span className="text-xs text-gray-500">{c.sellerInfo.bankName}</span>
                </td>
                <td className={`px-4 py-3 font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmtRSD(profit)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'VALID' ? 'bg-green-100 text-green-800' :
                    c.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(c.id)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Detalji
                    </button>
                    <button
                      onClick={() => onExecute(c.id)}
                      disabled={!canExecute}
                      className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      title={!canExecute ? 'Ugovor nije važeći ili je datum poravnanja prošao' : undefined}
                    >
                      Iskoristi
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
