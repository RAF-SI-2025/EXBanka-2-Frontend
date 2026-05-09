import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import { getBankAccounts } from '@/services/bankaService'
import BankFundPositionsTable from '@/components/bank/BankFundPositionsTable'
import InvestModal from '@/components/shared/InvestModal'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'
import type { AccountListItem } from '@/types'

export default function BankFundPositionsPage() {
  const navigate = useNavigate()
  const { bankFundPositions, bankPositionsLoading, fetchBankFundPositions, investInFund, redeemFromFund, sagaStatus } =
    useCelina4Store()

  const [bankAccountsAll, setBankAccountsAll] = useState<AccountListItem[]>([])
  const [bankAccountsRSD, setBankAccountsRSD] = useState<AccountListItem[]>([])
  const [investFundId, setInvestFundId] = useState<string | null>(null)
  const [redeemFundId, setRedeemFundId] = useState<string | null>(null)

  useEffect(() => {
    fetchBankFundPositions()
  }, [fetchBankFundPositions])

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate(-1)}>← Nazad</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Pozicije banke u fondovima</h1>
      <p className="mb-6 text-sm text-gray-500">Ova stranica prikazuje sve investicione fondove u kojima banka ima udele.</p>

      {bankPositionsLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <BankFundPositionsTable
          positions={bankFundPositions}
          onInvest={fundId => setInvestFundId(fundId)}
          onRedeem={fundId => setRedeemFundId(fundId)}
          onFundClick={fundId => navigate(`/funds/${fundId}`)}
        />
      )}

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
