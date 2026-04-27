import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import BankFundPositionsTable from '@/components/bank/BankFundPositionsTable'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

export default function BankFundPositionsPage() {
  const navigate = useNavigate()
  const { bankFundPositions, bankPositionsLoading, fetchBankFundPositions } = useCelina4Store()

  useEffect(() => {
    fetchBankFundPositions()
  }, [fetchBankFundPositions])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-gray-700" onClick={() => navigate(-1)}>← Nazad</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Pozicije banke u fondovima</h1>

      {bankPositionsLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <BankFundPositionsTable
          positions={bankFundPositions}
          onInvest={fundId => navigate(`/funds/${fundId}/invest`)}
          onRedeem={fundId => navigate(`/funds/${fundId}`)}
        />
      )}

      <SAGAStatusToast />
    </div>
  )
}
