import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import { getBankAccounts } from '@/services/bankaService'
import BankFundPositionsTable from '@/components/bank/BankFundPositionsTable'
import InvestModal from '@/components/shared/InvestModal'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'
import type { AccountListItem } from '@/types'

const fmtRSD = (v: number) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function BankFundPositionsPage() {
  const navigate = useNavigate()
  const { bankFundPositions, bankPositionsLoading, fetchBankFundPositions, investInFund, redeemFromFund, sagaStatus } =
    useCelina4Store()

  const [bankAccountsAll, setBankAccountsAll] = useState<AccountListItem[]>([])
  const [bankAccountsRSD, setBankAccountsRSD] = useState<AccountListItem[]>([])
  const [investFundId, setInvestFundId] = useState<string | null>(null)
  const [redeemFundId, setRedeemFundId] = useState<string | null>(null)

  useEffect(() => { fetchBankFundPositions() }, [fetchBankFundPositions])

  useEffect(() => {
    getBankAccounts()
      .then(list => {
        setBankAccountsAll(list)
        setBankAccountsRSD(list.filter(a => a.valuta_oznaka === 'RSD'))
      })
      .catch(() => { setBankAccountsAll([]); setBankAccountsRSD([]) })
  }, [])

  useEffect(() => {
    if (sagaStatus === 'success') fetchBankFundPositions()
  }, [sagaStatus, fetchBankFundPositions])

  async function handleInvestConfirm(amount: number, accountId: string) {
    if (!investFundId) return
    await investInFund(investFundId, amount, accountId)
    setInvestFundId(null)
  }

  async function handleRedeemConfirm(amount: number, accountId: string) {
    if (!redeemFundId) return
    await redeemFromFund(redeemFundId, amount, accountId)
    setRedeemFundId(null)
  }

  const totalInvested = bankFundPositions.reduce((s, p) => s + p.totalInvestedAmount, 0)
  const totalCurrent = bankFundPositions.reduce((s, p) => s + (p.currentPositionValue ?? p.totalInvestedAmount), 0)
  const totalProfit = totalCurrent - totalInvested
  const profitPositive = totalProfit >= 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ───────────────────────────────────────── */}
      <div className="px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
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
                Pozicije banke u fondovima
              </h1>
              <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                Investicioni fondovi u kojima banka ima aktivne udele.
              </p>
            </div>
            {!bankPositionsLoading && bankFundPositions.length > 0 && (
              <div className="flex flex-wrap gap-4">
                <div className="rounded-xl bg-white/10 px-6 py-3.5 text-center ring-1 ring-white/20">
                  <div className="text-3xl font-bold tabular-nums text-white">{bankFundPositions.length}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Pozicija</div>
                </div>
                <div className="rounded-xl bg-white/10 px-6 py-3.5 text-center ring-1 ring-white/20">
                  <div className="text-xl font-bold tabular-nums text-white">{fmtRSD(totalInvested)}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Uloženo</div>
                </div>
                <div className={`rounded-xl px-6 py-3.5 text-center ring-1 ${profitPositive ? 'bg-emerald-500/20 ring-emerald-400/30' : 'bg-red-500/20 ring-red-400/30'}`}>
                  <div className={`text-xl font-bold tabular-nums ${profitPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                    {profitPositive ? '+' : ''}{fmtRSD(totalProfit)}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">Profit</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        {bankPositionsLoading ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0">
                {[140, 100, 60, 110, 120, 90, 80, 100].map((w, j) => (
                  <div key={j} className="h-4 animate-pulse rounded-lg bg-gray-100" style={{ width: w }} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <BankFundPositionsTable
            positions={bankFundPositions}
            onInvest={fundId => setInvestFundId(fundId)}
            onRedeem={fundId => setRedeemFundId(fundId)}
            onFundClick={fundId => navigate(`/funds/${fundId}`)}
          />
        )}
      </div>

      {investFundId && bankAccountsRSD.length > 0 && (
        <InvestModal
          fundId={investFundId}
          mode="invest"
          accounts={bankAccountsRSD}
          onConfirm={handleInvestConfirm}
          onClose={() => setInvestFundId(null)}
        />
      )}

      {redeemFundId && bankAccountsAll.length > 0 && (
        <InvestModal
          fundId={redeemFundId}
          mode="redeem"
          accounts={bankAccountsAll}
          onConfirm={handleRedeemConfirm}
          onClose={() => setRedeemFundId(null)}
        />
      )}

      <SAGAStatusToast />
    </div>
  )
}
