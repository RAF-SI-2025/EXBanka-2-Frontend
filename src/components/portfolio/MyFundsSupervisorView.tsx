import type { InvestmentFund } from '@/types/celina4'

interface MyFundsSupervisorViewProps {
  funds: InvestmentFund[]
  onViewDetail: (fundId: string) => void
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function MyFundsSupervisorView({ funds, onViewDetail }: MyFundsSupervisorViewProps) {
  if (funds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-lg font-medium">Nemate fondova kojima upravljate.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Naziv', 'Vrednost fonda', 'Profit', 'Likvidna sredstva', 'Min. uplata', 'Br. hartija', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {funds.map(fund => (
            <tr
              key={fund.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onViewDetail(fund.id)}
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-900">{fund.name}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{fund.description}</p>
              </td>
              <td className="px-4 py-3 text-gray-700">{fmtRSD(fund.fundValue)}</td>
              <td className={`px-4 py-3 font-semibold ${fund.profit !== null && fund.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmtRSD(fund.profit)}
              </td>
              <td className="px-4 py-3 text-gray-700">{fmtRSD(fund.liquidAssets)}</td>
              <td className="px-4 py-3 text-gray-700">{fmtRSD(fund.minimumContribution)}</td>
              <td className="px-4 py-3 text-gray-700">{fund.securities.length}</td>
              <td className="px-4 py-3">
                <button
                  onClick={e => { e.stopPropagation(); onViewDetail(fund.id) }}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Detalji
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
