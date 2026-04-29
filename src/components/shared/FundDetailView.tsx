import { useState } from 'react'
import type { InvestmentFund } from '@/types/celina4'
import type { C4UserRole } from '@/types/celina4'
import FundPerformanceChart from '@/components/funds/FundPerformanceChart'
import FundSecuritiesList from '@/components/funds/FundSecuritiesList'
import InvestModal from '@/components/shared/InvestModal'
import { useCelina4Store } from '@/store/useCelina4Store'
import type { AccountListItem } from '@/types'

interface FundDetailViewProps {
  fund: InvestmentFund
  userRole: C4UserRole
  bankAccounts?: AccountListItem[]
  clientAccounts?: AccountListItem[]
}

const fmtRSD = (v: number | null) =>
  v === null
    ? '—'
    : new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(v)

export default function FundDetailView({ fund, userRole, bankAccounts = [], clientAccounts = [] }: FundDetailViewProps) {
  const [investModal, setInvestModal] = useState<'invest' | 'redeem' | null>(null)
  const { investInFund, redeemFromFund, sellFundSecurity, performanceData, performanceLoading } = useCelina4Store()

  const isSupervisor = userRole === 'SUPERVISOR'
  const isClient = userRole === 'CLIENT'
  const accounts = isSupervisor ? bankAccounts : clientAccounts

  async function handleInvest(amount: number, accountId: string) {
    await investInFund(fund.id, amount, accountId)
    setInvestModal(null)
  }

  async function handleRedeem(amount: number, accountId: string) {
    await redeemFromFund(fund.id, amount === -1 ? fund.fundValueRsd ?? 0 : amount, accountId)
    setInvestModal(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fund.name}</h1>
          <p className="mt-1 text-gray-600">{fund.description}</p>
        </div>
        <div className="flex gap-2">
          {(isClient || isSupervisor) && (
            <>
              <button
                onClick={() => setInvestModal('invest')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {isSupervisor ? 'Investiraj u ime banke' : 'Uplati'}
              </button>
              <button
                onClick={() => setInvestModal('redeem')}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Povuci
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Vrednost fonda', value: fmtRSD(fund.fundValueRsd) },
          { label: 'Profit', value: fmtRSD(fund.profit), positive: fund.profit !== null && fund.profit > 0 },
          { label: 'Likvidna sredstva', value: fmtRSD(fund.liquidAssets) },
          { label: 'Min. uplata', value: fmtRSD(fund.minimumContribution) },
        ].map(({ label, value, positive }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-lg font-bold ${positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : 'text-gray-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Manager info */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
        <span className="text-gray-500">Menadžer: </span>
        <span className="font-medium text-gray-900">{fund.managerName || '—'}</span>
        <span className="ml-4 text-gray-500">Br. računa: </span>
        <span className="font-mono text-gray-900">{fund.accountNumber || '—'}</span>
      </div>

      {/* Performance chart */}
      <FundPerformanceChart
        fundId={fund.id}
        performanceData={performanceData}
        isLoading={performanceLoading}
      />

      {/* Securities list */}
      <FundSecuritiesList
        securities={fund.securities}
        userRole={userRole}
        fundId={fund.id}
        onSell={ticker => sellFundSecurity(fund.id, ticker)}
      />

      {/* Modal */}
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
