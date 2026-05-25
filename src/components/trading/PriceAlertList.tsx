import { useEffect, useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { deletePriceAlert, listPriceAlerts } from '@/services/priceAlertService'
import type { PriceAlert } from '@/types'

export default function PriceAlertList() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPriceAlerts()
      .then(setAlerts)
      .catch(() => setError('Greška pri učitavanju alarma.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deletePriceAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      setError('Greška pri brisanju alarma.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Učitavanje alarma...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
        <Bell size={32} />
        <p className="text-sm">Nemate aktivnih price alarma.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
            alert.active ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell
              size={18}
              className={alert.active ? 'text-blue-500' : 'text-gray-400'}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">{alert.ticker}</p>
              <p className="text-xs text-gray-500">
                {alert.direction === 'ABOVE' ? 'Iznad' : 'Ispod'} ${alert.threshold.toFixed(4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                alert.active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {alert.active ? 'Aktivan' : 'Okidnut'}
            </span>
            {alert.active && (
              <button
                onClick={() => handleDelete(alert.id)}
                disabled={deletingId === alert.id}
                className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                title="Obriši alarm"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
