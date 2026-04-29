import type { ClientFundPosition } from '@/types/celina4'

interface MyFundsClientViewProps {
  positions: ClientFundPosition[]
  onInvest: (fundId: string) => void
  onRedeem: (fundId: string) => void
  onViewDetail: (fundId: string) => void
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function MyFundsClientView({ positions, onInvest, onRedeem, onViewDetail }: MyFundsClientViewProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium">Nemate aktivnih investicija u fondove.</p>
        <p className="mt-1 text-sm">Istražite dostupne fondove i počnite da investirate.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {positions.map(pos => {
        const profit = pos.currentPositionValue !== null
          ? pos.currentPositionValue - pos.totalInvestedAmount
          : null
        const profitPositive = profit !== null && profit > 0

        return (
          <div
            key={pos.id}
            className="flex cursor-pointer flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            onClick={() => onViewDetail(pos.fundId)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onViewDetail(pos.fundId)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fond</p>
                <p className="font-semibold text-gray-900">{pos.fundId}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${profitPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {profit !== null ? `${profitPositive ? '+' : ''}${fmtRSD(profit)}` : '—'}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Uloženo</dt>
                <dd className="font-medium">{fmtRSD(pos.totalInvestedAmount)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Trenutna vrednost</dt>
                <dd className="font-medium">{fmtRSD(pos.currentPositionValue)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Udeo u fondu</dt>
                <dd className="font-medium">
                  {pos.fundSharePercentage !== null ? `${pos.fundSharePercentage.toFixed(2)}%` : '—'}
                </dd>
              </div>
            </dl>

            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); onInvest(pos.fundId) }}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Uplati
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRedeem(pos.fundId) }}
                className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Povuci
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
