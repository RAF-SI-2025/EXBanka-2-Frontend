import type { InvestmentFund } from '@/types/celina4'

interface FundCardProps {
  fund: InvestmentFund
  onClick: () => void
  showInvestButton?: boolean
  onInvest?: () => void
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function FundCard({ fund, onClick, showInvestButton, onInvest }: FundCardProps) {
  const profitPositive = fund.profit !== null && fund.profit > 0

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 truncate">{fund.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{fund.description}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-gray-500">Vrednost fonda</dt>
          <dd className="font-medium text-gray-900">{fmtRSD(fund.fundValueRsd)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Profit</dt>
          <dd className={`font-semibold ${profitPositive ? 'text-green-600' : 'text-red-600'}`}>
            {fmtRSD(fund.profit)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-500">Min. uplata</dt>
          <dd className="font-medium text-gray-900">{fmtRSD(fund.minimumContribution)}</dd>
        </div>
      </dl>

      {showInvestButton && onInvest && (
        <button
          className="mt-auto w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          onClick={e => { e.stopPropagation(); onInvest() }}
        >
          Investiraj
        </button>
      )}
    </div>
  )
}
