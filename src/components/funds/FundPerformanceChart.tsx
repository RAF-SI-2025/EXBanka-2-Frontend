import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useCelina4Store } from '@/store/useCelina4Store'

type Period = 'monthly' | 'quarterly' | 'yearly'

interface FundPerformanceChartProps {
  fundId: string
  performanceData: { period: string; value: number }[]
  isLoading: boolean
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'monthly', label: 'Mesečno' },
  { key: 'quarterly', label: 'Kvartalno' },
  { key: 'yearly', label: 'Godišnje' },
]

const fmtRSD = (v: number) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function FundPerformanceChart({ fundId, performanceData, isLoading }: FundPerformanceChartProps) {
  const [period, setPeriod] = useState<Period>('monthly')
  const fetchFundPerformance = useCelina4Store(s => s.fetchFundPerformance)

  useEffect(() => {
    fetchFundPerformance(fundId, period)
  }, [fundId, period, fetchFundPerformance])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Performanse fonda</h3>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                period === p.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : performanceData.length === 0 ? (
        <p className="flex h-48 items-center justify-center text-sm text-gray-400">
          Nema dostupnih podataka.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={performanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [fmtRSD(v), 'Vrednost']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name="Vrednost fonda"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
