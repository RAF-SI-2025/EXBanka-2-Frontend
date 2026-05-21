import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import ActuaryPerformanceTable from '@/components/bank/ActuaryPerformanceTable'

export default function ActuaryPerformancePage() {
  const navigate = useNavigate()
  const { actuaryPerformances, actuaryLoading, fetchActuaryPerformance } = useCelina4Store()

  useEffect(() => { fetchActuaryPerformance() }, [fetchActuaryPerformance])

  const totalProfit = actuaryPerformances.reduce((sum, a) => sum + a.profit, 0)
  const fmtRSD = (v: number) =>
    new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300 transition-colors hover:text-blue-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Nazad
              </button>
              <h1 className="text-[2.6rem] font-bold leading-tight tracking-tight text-white">
                Performanse aktuara
              </h1>
              <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                Pregled profita i uloga svih aktuara u sistemu.
              </p>
            </div>
            {!actuaryLoading && (
              <div className="flex gap-4">
                <div className="rounded-xl bg-white/10 px-6 py-3.5 text-center ring-1 ring-white/20">
                  <div className="text-3xl font-bold tabular-nums text-white">{actuaryPerformances.length}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Aktuara</div>
                </div>
                <div className={`rounded-xl px-6 py-3.5 text-center ring-1 ${totalProfit >= 0 ? 'bg-emerald-500/20 ring-emerald-400/30' : 'bg-red-500/20 ring-red-400/30'}`}>
                  <div className={`text-xl font-bold tabular-nums ${totalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {fmtRSD(totalProfit)}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Ukupan profit</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        {actuaryLoading ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-lg bg-gray-100" />
                  <div className="h-3 w-24 animate-pulse rounded-lg bg-gray-100" />
                </div>
                <div className="h-5 w-28 animate-pulse rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (
          <ActuaryPerformanceTable actuaries={actuaryPerformances} />
        )}
      </div>
    </div>
  )
}
