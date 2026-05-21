import type { OTCContract } from '@/types/celina4'
import { useAuthStore } from '@/store/authStore'

interface OTCContractTableProps {
  contracts: OTCContract[]
  onExecute: (id: string) => void
  onView: (id: string) => void
  filter: 'valid' | 'expired' | 'all'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtUSD(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)
}

const STATUS_LABELS: Record<OTCContract['status'], string> = {
  VALID: 'Važeći',
  EXPIRED: 'Istekao',
  EXERCISED: 'Iskorišćen',
}

const STATUS_STYLES: Record<OTCContract['status'], string> = {
  VALID: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  EXPIRED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  EXERCISED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
}

function effectiveStatus(c: OTCContract): OTCContract['status'] {
  if (c.status === 'VALID' && new Date(c.settlementDate) < new Date()) return 'EXPIRED'
  return c.status
}

export default function OTCContractTable({ contracts, onExecute, onView, filter }: OTCContractTableProps) {
  const { user } = useAuthStore()
  const callerID = String(user?.id ?? '')

  const visible = contracts.filter(c => {
    const s = effectiveStatus(c)
    if (filter === 'all') return true
    if (filter === 'valid') return s === 'VALID'
    return s === 'EXPIRED' || s === 'EXERCISED'
  })

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500">Nema ugovora.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {['Akcija', 'Količina', 'Strike cena', 'Premija', 'Poravnanje', 'Prodavac', 'Profit', 'Status', ''].map(h => (
              <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visible.map(c => {
            const currentPrice = c.stock.lastKnownMarketPrice ?? c.strikePrice
            const profit = (c.amount * currentPrice) - (c.amount * c.strikePrice) - c.premium
            const status = effectiveStatus(c)
            const isBuyer = c.buyerId === callerID
            const profitPositive = profit >= 0

            return (
              <tr key={c.id} className="transition-colors hover:bg-blue-50/40">
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                    {c.stock.ticker}
                  </span>
                  <span className="ml-1.5 text-xs text-gray-400">({c.stock.exchange})</span>
                </td>
                <td className="px-5 py-3.5 font-mono text-gray-700">{c.amount.toLocaleString('sr-RS')}</td>
                <td className="px-5 py-3.5 font-mono text-gray-700">{fmtUSD(c.strikePrice)}</td>
                <td className="px-5 py-3.5 font-mono text-gray-700">{fmtUSD(c.premium)}</td>
                <td className="px-5 py-3.5 text-gray-600">{formatDate(c.settlementDate)}</td>
                <td className="px-5 py-3.5">
                  <span className="block text-sm font-medium text-gray-800">{c.sellerInfo.name}</span>
                  <span className="text-xs text-gray-400">{c.sellerInfo.bankName}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`flex items-center gap-1 font-mono text-sm font-semibold ${profitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {profitPositive
                      ? <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    }
                    {fmtUSD(profit)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(c.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      Detalji
                    </button>
                    {isBuyer && (
                      <button
                        onClick={() => onExecute(c.id)}
                        disabled={status !== 'VALID'}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        title={status !== 'VALID' ? 'Ugovor nije važeći ili je datum poravnanja prošao' : undefined}
                      >
                        Iskoristi
                      </button>
                    )}
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
