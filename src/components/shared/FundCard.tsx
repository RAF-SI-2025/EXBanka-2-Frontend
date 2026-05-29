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

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`

const METRIC_TOOLTIPS: Record<string, string> = {
  return:     'Godišnji prinos (CAGR) — prosečan godišnji rast vrednosti fonda',
  rv:         'Reward-to-variability — odnos prinosa i rizika; viši je bolji (iznad 1 se smatra dobrim)',
  drawdown:   'Max drawdown — najveći pad od vrha do dna; niži znači manji rizik',
  volatility: 'Volatilnost — standardna devijacija mesečnih prinosa; niža = stabilniji fond',
}

export default function FundCard({ fund, onClick, showInvestButton, onInvest }: FundCardProps) {
  const profitPositive = fund.profit !== null && fund.profit >= 0
  const hasProfit = fund.profit !== null
  const s = fund.stats

  return (
    <div
      className="group flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Color accent bar */}
      <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 to-indigo-500" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Name + description */}
        <div>
          <h3 className="truncate text-base font-bold text-gray-900">{fund.name}</h3>
          {fund.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{fund.description}</p>
          )}
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Vrednost</p>
            <p className="mt-0.5 text-sm font-bold text-gray-800">{fmtRSD(fund.fundValueRsd)}</p>
          </div>
          <div className={`rounded-xl px-3 py-2.5 ${hasProfit ? (profitPositive ? 'bg-emerald-50' : 'bg-red-50') : 'bg-gray-50'}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Profit</p>
            <p className={`mt-0.5 flex items-center gap-0.5 text-sm font-bold ${hasProfit ? (profitPositive ? 'text-emerald-600' : 'text-red-500') : 'text-gray-800'}`}>
              {hasProfit && (
                profitPositive
                  ? <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                  : <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              )}
              {fmtRSD(fund.profit)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Min. uplata</p>
            <p className="mt-0.5 text-sm font-bold text-gray-800">{fmtRSD(fund.minimumContribution)}</p>
          </div>
        </div>

        {/* Performance metrics */}
        {s ? (
          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
            <Metric
              label="God. prinos"
              value={fmtPct(s.annualizedReturn)}
              color={s.annualizedReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}
              title={METRIC_TOOLTIPS.return}
            />
            <Metric
              label="Prinos / Rizik"
              value={s.rewardToVariability.toFixed(2)}
              color={s.rewardToVariability >= 1 ? 'text-emerald-600' : s.rewardToVariability >= 0 ? 'text-amber-600' : 'text-red-500'}
              title={METRIC_TOOLTIPS.rv}
            />
            <Metric
              label="Max drawdown"
              value={fmtPct(s.maxDrawdown)}
              color="text-amber-600"
              title={METRIC_TOOLTIPS.drawdown}
            />
            <Metric
              label="Volatilnost"
              value={fmtPct(s.volatility)}
              color="text-gray-700"
              title={METRIC_TOOLTIPS.volatility}
            />
          </div>
        ) : (
          <p className="border-t border-gray-100 pt-3 text-center text-[10px] text-gray-400">
            Nedovoljno istorijskih podataka za statistiku
          </p>
        )}

        {/* Invest button */}
        {showInvestButton && onInvest && (
          <button
            className="mt-auto w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            onClick={e => { e.stopPropagation(); onInvest() }}
          >
            Investiraj
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color, title }: {
  label: string
  value: string
  color: string
  title: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-2.5 py-2" title={title}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-0.5 text-xs font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
