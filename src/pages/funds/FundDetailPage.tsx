import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import FundDetailView from '@/components/shared/FundDetailView'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'
import type { C4UserRole } from '@/types/celina4'
import type { AccountListItem } from '@/types'

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export default function FundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasPermission, accessToken } = useAuthStore()
  const { activeFund, activeFundLoading, fetchFundDetail } = useCelina4Store()
  const [bankAccounts, setBankAccounts] = useState<AccountListItem[]>([])

  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')
  const isClient = user?.userType === 'CLIENT'

  const userRole: C4UserRole = isSupervisor ? 'SUPERVISOR' : isClient ? 'CLIENT' : 'AGENT'

  useEffect(() => {
    if (!id) return
    fetchFundDetail(id)
  }, [id, fetchFundDetail])

  useEffect(() => {
    if (!isSupervisor) return
    fetch(`${API_BASE}/api/bank/accounts`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then(r => r.json())
      .then(data => setBankAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [isSupervisor, accessToken])

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
        bankAccounts={bankAccounts}
      />

      <SAGAStatusToast />
    </div>
  )
}
