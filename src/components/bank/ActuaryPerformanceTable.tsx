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

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1 text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800 select-none"
              onClick={() => toggleSort('name')}
            >
              Ime i prezime <SortIcon k="name" />
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800 select-none"
              onClick={() => toggleSort('role')}
            >
              Uloga <SortIcon k="role" />
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-800 select-none"
              onClick={() => toggleSort('profit')}
            >
              Profit <SortIcon k="profit" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={3} className="py-10 text-center text-gray-400">
                Nema podataka.
              </td>
            </tr>
          )}
          {sorted.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {a.name} {a.surname}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  a.role === 'SUPERVISOR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {ROLE_LABELS[a.role] ?? a.role}
                </span>
              </td>
              <td className={`px-4 py-3 font-semibold ${a.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmtRSD(a.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
