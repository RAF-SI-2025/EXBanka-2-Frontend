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
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Fond', 'Menadžer', 'Udeo (%)', 'Uloženo', 'Trenutna vrednost', 'Profit', 'Poslednja izmena', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {positions.length === 0 && (
            <tr>
              <td colSpan={8} className="py-10 text-center text-gray-400">
                Banka nema pozicija u fondovima.
              </td>
            </tr>
          )}
          {positions.map(pos => {
            const profit = pos.currentPositionValue !== null
              ? pos.currentPositionValue - pos.totalInvestedAmount
              : null
            const profitPositive = profit !== null && profit > 0

            return (
              <tr
                key={pos.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onFundClick(pos.fundId)}
              >
                <td className="px-4 py-3 font-medium text-blue-700 underline-offset-2 hover:underline">
                  {pos.fundName ?? pos.fundId}
                </td>
                <td className="px-4 py-3 text-gray-700">{pos.managerName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">
                  {pos.fundSharePercentage !== null ? `${pos.fundSharePercentage.toFixed(2)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(pos.totalInvestedAmount)}</td>
                <td className="px-4 py-3 text-gray-700">{fmtRSD(pos.currentPositionValue)}</td>
                <td className={`px-4 py-3 font-semibold ${profit === null ? 'text-gray-400' : profitPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {profit !== null ? `${profitPositive ? '+' : ''}${fmtRSD(profit)}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(pos.lastModifiedDate)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onInvest(pos.fundId)}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Uplati
                    </button>
                    <button
                      onClick={() => onRedeem(pos.fundId)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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
