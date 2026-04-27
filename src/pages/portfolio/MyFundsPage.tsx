import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import MyFundsClientView from '@/components/portfolio/MyFundsClientView'
import MyFundsSupervisorView from '@/components/portfolio/MyFundsSupervisorView'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

export default function MyFundsPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const {
    myFundPositions,
    myPositionsLoading,
    funds,
    fundsLoading,
    fetchMyPositions,
    fetchFunds,
  } = useCelina4Store()

  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')

  useEffect(() => {
    if (isSupervisor) {
      fetchFunds()
    } else {
      fetchMyPositions()
    }
  }, [isSupervisor, fetchMyPositions, fetchFunds])

  const isLoading = isSupervisor ? fundsLoading : myPositionsLoading

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isSupervisor ? 'Moji fondovi' : 'Moje investicije'}
        </h1>
        {!isSupervisor && (
          <button
            onClick={() => navigate('/funds')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Istraži fondove
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : isSupervisor ? (
        <MyFundsSupervisorView
          funds={funds}
          onViewDetail={id => navigate(`/funds/${id}`)}
        />
      ) : (
        <MyFundsClientView
          positions={myFundPositions}
          onInvest={fundId => navigate(`/funds/${fundId}/invest`)}
          onRedeem={fundId => navigate(`/funds/${fundId}`)}
          onViewDetail={fundId => navigate(`/funds/${fundId}`)}
        />
      )}

      <SAGAStatusToast />
    </div>
  )
}
