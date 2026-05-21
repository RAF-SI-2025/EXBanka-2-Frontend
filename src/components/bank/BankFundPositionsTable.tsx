import type { ClientFundPosition } from '@/types/celina4'

interface BankFundPositionsTableProps {
  positions: ClientFundPosition[]
  onInvest: (fundId: string) => void
  onRedeem: (fundId: string) => void
  onFundClick: (fundId: string) => void
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BankFundPositionsTable({ positions, onInvest, onRedeem, onFundClick }: BankFundPositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500">Banka nema pozicija u fondovima.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {['Fond', 'Menadžer', 'Udeo (%)', 'Uloženo', 'Trenutna vrednost', 'Profit', 'Poslednja izmena', ''].map(h => (
              <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {positions.map(pos => {
            const profit = pos.currentPositionValue !== null
              ? pos.currentPositionValue - pos.totalInvestedAmount
              : null
            const profitPositive = profit !== null && profit > 0

            return (
              <tr
                key={pos.id}
                className="group cursor-pointer transition-colors hover:bg-blue-50/40"
                onClick={() => onFundClick(pos.fundId)}
              >
                <td className="px-5 py-4">
                  <span className="font-semibold text-blue-600 transition-colors group-hover:text-blue-800">
                    {pos.fundName ?? pos.fundId}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-600">{pos.managerName ?? '—'}</td>
                <td className="px-5 py-4">
                  {pos.fundSharePercentage !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-400"
                          style={{ width: `${Math.min(pos.fundSharePercentage, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-medium text-gray-700">
                        {pos.fundSharePercentage.toFixed(2)}%
                      </span>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-5 py-4 font-mono text-gray-700">{fmtRSD(pos.totalInvestedAmount)}</td>
                <td className="px-5 py-4 font-mono font-medium text-gray-800">{fmtRSD(pos.currentPositionValue)}</td>
                <td className="px-5 py-4">
                  {profit === null ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span className={`flex items-center gap-1 font-mono text-sm font-bold ${profitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {profitPositive
                        ? <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                        : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      }
                      {profitPositive ? '+' : ''}{fmtRSD(profit)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">{formatDate(pos.lastModifiedDate)}</td>
                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onInvest(pos.fundId)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Uplati
                    </button>
                    <button
                      onClick={() => onRedeem(pos.fundId)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Povuci
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
