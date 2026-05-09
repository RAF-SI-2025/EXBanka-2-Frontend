import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import FundDetailView from '@/components/shared/FundDetailView'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'
import { getBankAccounts, getClientAccounts } from '@/services/bankaService'
import type { C4UserRole } from '@/types/celina4'
import type { AccountListItem } from '@/types'

export default function FundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const { activeFund, activeFundLoading, fetchFundDetail, sagaStatus } = useCelina4Store()
  const [bankAccountsRSD, setBankAccountsRSD] = useState<AccountListItem[]>([])
  const [bankAccountsAll, setBankAccountsAll] = useState<AccountListItem[]>([])
  const [clientAccounts, setClientAccounts] = useState<AccountListItem[]>([])

  const isSupervisor = (user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN') && hasPermission('SUPERVISOR')
  const isClient = user?.userType === 'CLIENT'

  const userRole: C4UserRole = isSupervisor ? 'SUPERVISOR' : isClient ? 'CLIENT' : 'AGENT'

  useEffect(() => {
    if (!id) return
    fetchFundDetail(id)
  }, [id, fetchFundDetail])

  function loadAccounts() {
    if (isSupervisor) {
      getBankAccounts()
        .then(list => {
          setBankAccountsAll(list)
          setBankAccountsRSD(list.filter(a => a.valuta_oznaka === 'RSD'))
        })
        .catch(() => { setBankAccountsAll([]); setBankAccountsRSD([]) })
    } else if (isClient) {
      getClientAccounts()
        .then(list => setClientAccounts(list))
        .catch(() => setClientAccounts([]))
    }
  }

  useEffect(() => { loadAccounts() }, [isSupervisor, isClient]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sagaStatus === 'success') loadAccounts()
  }, [sagaStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  if (activeFundLoading || !activeFund) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <button className="hover:text-gray-700" onClick={() => navigate('/funds')}>
          ← Fondovi
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{activeFund.name}</span>
      </nav>

      <FundDetailView
        fund={activeFund}
        userRole={userRole}
        investAccounts={isSupervisor ? bankAccountsRSD : clientAccounts}
        redeemAccounts={isSupervisor ? bankAccountsAll : clientAccounts}
      />

      <SAGAStatusToast />
    </div>
  )
}
