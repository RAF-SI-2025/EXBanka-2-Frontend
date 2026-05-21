import { useState } from 'react'
import type { ActuaryPerformance } from '@/types/celina4'

interface ActuaryPerformanceTableProps {
  actuaries: ActuaryPerformance[]
}

type SortKey = 'name' | 'role' | 'profit'
type SortDir = 'asc' | 'desc'

const fmtRSD = (v: number) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

const ROLE_LABELS: Record<string, string> = {
  AGENT: 'Agent',
  SUPERVISOR: 'Supervizor',
}

const ROLE_STYLES: Record<string, string> = {
  AGENT:      'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  SUPERVISOR: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function ActuaryPerformanceTable({ actuaries }: ActuaryPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('profit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...actuaries].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
    else if (sortKey === 'role') cmp = a.role.localeCompare(b.role)
    else cmp = a.profit - b.profit
    return sortDir === 'asc' ? cmp : -cmp
  })

  const maxAbsProfit = Math.max(...actuaries.map(a => Math.abs(a.profit)), 1)

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return (
      <svg className="ml-1 inline h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
    return (
      <svg className="ml-1 inline h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {sortDir === 'asc'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        }
      </svg>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500">Nema podataka o aktuarima.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="w-12 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              #
            </th>
            <th
              className="cursor-pointer select-none px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
              onClick={() => toggleSort('name')}
            >
              Ime i prezime <SortIcon k="name" />
            </th>
            <th
              className="cursor-pointer select-none px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
              onClick={() => toggleSort('role')}
            >
              Uloga <SortIcon k="role" />
            </th>
            <th
              className="cursor-pointer select-none px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
              onClick={() => toggleSort('profit')}
            >
              Profit <SortIcon k="profit" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((a, idx) => {
            const profitPct = Math.round((Math.abs(a.profit) / maxAbsProfit) * 100)
            const profitPositive = a.profit >= 0
            return (
              <tr key={a.id} className="transition-colors hover:bg-blue-50/40">
                <td className="px-5 py-4 text-center">
                  {idx < 3
                    ? <span className="text-base">{RANK_MEDALS[idx]}</span>
                    : <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                  }
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                      {a.name[0]}{a.surname[0]}
                    </div>
                    <span className="font-semibold text-gray-900">{a.name} {a.surname}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${ROLE_STYLES[a.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[a.role] ?? a.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className={`font-mono text-sm font-bold ${profitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {profitPositive ? '+' : ''}{fmtRSD(a.profit)}
                    </span>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${profitPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${profitPct}%` }}
                      />
                    </div>
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
