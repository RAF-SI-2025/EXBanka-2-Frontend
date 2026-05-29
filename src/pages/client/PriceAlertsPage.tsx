import { Bell } from 'lucide-react'
import PriceAlertList from '@/components/trading/PriceAlertList'

export default function PriceAlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Alarmi</h1>
        <p className="text-sm text-gray-500 mt-1">Vaši aktivni i okidnuti alarmi za cene hartija</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
          <Bell className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-700">Svi alarmi</h2>
        </div>
        <PriceAlertList />
      </div>
    </div>
  )
}
