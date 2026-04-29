import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import CreateFundForm from '@/components/funds/CreateFundForm'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

export default function CreateFundPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()

  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')

  if (!isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <p className="text-lg font-medium">Pristup odbijen.</p>
        <p className="mt-1 text-sm">Samo supervizori mogu kreirati fondove.</p>
        <button
          onClick={() => navigate('/funds')}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Nazad na fondove
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-gray-500">
        <button className="hover:text-gray-700" onClick={() => navigate('/funds')}>
          ← Fondovi
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Novi fond</span>
      </nav>

      <CreateFundForm onSuccess={() => navigate('/funds')} />

      <SAGAStatusToast />
    </div>
  )
}
