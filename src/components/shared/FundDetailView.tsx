import { useState } from 'react'
import type { InvestmentFund, C4UserRole } from '@/types/celina4'
import FundPerformanceChart from '@/components/funds/FundPerformanceChart'
import FundSecuritiesList from '@/components/funds/FundSecuritiesList'
import InvestModal from '@/components/shared/InvestModal'
import { useCelina4Store } from '@/store/useCelina4Store'
import type { AccountListItem } from '@/types'

interface FundDetailViewProps {
  fund: InvestmentFund
  userRole: C4UserRole
  investAccounts?: AccountListItem[]
  redeemAccounts?: AccountListItem[]
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function FundDetailView({ fund, userRole, investAccounts = [], redeemAccounts = [] }: FundDetailViewProps) {
  const [investModal, setInvestModal] = useState<'invest' | 'redeem' | null>(null)
  const { investInFund, redeemFromFund, sellFundSecurity, performanceData, performanceLoading } = useCelina4Store()

  const isSupervisor = userRole === 'SUPERVISOR'
  const isClient = userRole === 'CLIENT'
  const accounts = investModal === 'redeem' ? redeemAccounts : investAccounts

  const profitPositive = fund.profit !== null && fund.profit > 0
  const profitNegative = fund.profit !== null && fund.profit < 0

  async function handleInvest(amount: number, accountId: string) {
    await investInFund(fund.id, amount, accountId)
    setInvestModal(null)
  }

  async function handleRedeem(amount: number, accountId: string) {
    await redeemFromFund(fund.id, amount, accountId)
    setInvestModal(null)
  }

  return (
    <div className="space-y-6">
      {/* ── Gradient header ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300">
              Investicioni fond
            </p>
            <h1 className="text-[2.2rem] font-bold leading-tight tracking-tight text-white">
              {fund.name}
            </h1>
            {fund.description && (
              <p className="mt-3 max-w-lg text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                {fund.description}
              </p>
            )}
          </div>
          {(isClient || isSupervisor) && (
            <div className="flex shrink-0 gap-2 sm:flex-col">
              <button
                onClick={() => setInvestModal('invest')}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
              >
                {isSupervisor ? 'Investiraj u ime banke' : 'Uplati'}
              </button>
              <button
                onClick={() => setInvestModal('redeem')}
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Povuci
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Vrednost fonda"
          value={fmtRSD(fund.fundValueRsd)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent="blue"
        />
        <StatCard
          label="Profit"
          value={fmtRSD(fund.profit)}
          icon={
            profitPositive
              ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
          }
          accent={profitPositive ? 'green' : profitNegative ? 'red' : 'gray'}
          valueColor={profitPositive ? 'text-emerald-600' : profitNegative ? 'text-red-500' : undefined}
        />
        <StatCard
          label="Likvidna sredstva"
          value={fmtRSD(fund.liquidAssets)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
          accent="indigo"
        />
        <StatCard
          label="Min. uplata"
          value={fmtRSD(fund.minimumContribution)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          accent="gray"
        />
      </div>

      {/* ── Manager info ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-6 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Menadžer</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{fund.managerName || '—'}</p>
        </div>
        <div className="h-full w-px bg-gray-100" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Broj računa fonda</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-gray-900">{fund.accountNumber || '—'}</p>
        </div>
      </div>

      {/* ── Performance statistics ───────────────────────────── */}
      {fund.stats ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-400">Statistika performansi</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PerfStat
              label="God. prinos (CAGR)"
              value={`${(fund.stats.annualizedReturn * 100).toFixed(2)}%`}
              sub={`${fund.stats.snapshotCount} snimaka`}
              color={fund.stats.annualizedReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <PerfStat
              label="Prinos / Rizik"
              value={fund.stats.rewardToVariability.toFixed(3)}
              sub="viši = bolji"
              color={fund.stats.rewardToVariability >= 1 ? 'text-emerald-600' : fund.stats.rewardToVariability >= 0 ? 'text-amber-600' : 'text-red-500'}
            />
            <PerfStat
              label="Max drawdown"
              value={`${(fund.stats.maxDrawdown * 100).toFixed(2)}%`}
              sub="pad od vrha"
              color="text-amber-600"
            />
            <PerfStat
              label="Volatilnost"
              value={`${(fund.stats.volatility * 100).toFixed(2)}%`}
              sub="god. std. devijacija"
              color="text-gray-700"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-400">
          Nedovoljno istorijskih podataka za prikaz statistike (potrebno min. 3 snimka).
        </div>
      )}

      {/* ── Performance chart ────────────────────────────────── */}
      <FundPerformanceChart
        fundId={fund.id}
        performanceData={performanceData}
        isLoading={performanceLoading}
      />

      {/* ── Securities list ──────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-400">Hartije od vrednosti</h2>
        <FundSecuritiesList
          securities={fund.securities}
          userRole={userRole}
          fundId={fund.id}
          onSell={ticker => sellFundSecurity(fund.id, ticker)}
        />
      </div>

      {investModal && (
        <InvestModal
          fundId={fund.id}
          mode={investModal}
          accounts={accounts}
          minimumContribution={fund.minimumContribution}
          liquidAssets={fund.liquidAssets}
          onConfirm={investModal === 'invest' ? handleInvest : handleRedeem}
          onClose={() => setInvestModal(null)}
        />
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const ACCENT_STYLES = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500'   },
  green:  { bg: 'bg-emerald-50',icon: 'text-emerald-500' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-400'    },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500' },
  gray:   { bg: 'bg-gray-50',   icon: 'text-gray-400'   },
}

function StatCard({ label, value, icon, accent, valueColor }: {
  label: string
  value: string
  icon: React.ReactNode
  accent: keyof typeof ACCENT_STYLES
  valueColor?: string
}) {
  const style = ACCENT_STYLES[accent]
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${style.bg}`}>
        <span className={style.icon}>{icon}</span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function PerfStat({ label, value, sub, color }: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>
    </div>
  )
}
