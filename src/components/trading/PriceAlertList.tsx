import { useEffect, useState } from 'react'
import { Bell, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { deletePriceAlert, listPriceAlerts } from '@/services/priceAlertService'
import type { PriceAlert } from '@/types'

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function PriceAlertList() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    listPriceAlerts()
      .then(setAlerts)
      .catch(() => toast.error('Greška pri učitavanju alarma.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deletePriceAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      toast.success('Alarm je obrisan.')
    } catch {
      toast.error('Greška pri brisanju alarma.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-4">Učitavanje alarma...</p>
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
        <Bell size={36} strokeWidth={1.5} />
        <p className="text-sm font-medium">Nemate aktivnih price alarma.</p>
        <p className="text-xs text-gray-300">Postavite alarm sa stranice detalja hartije ili iz watchliste.</p>
      </div>
    )
  }

  const activeAlerts = alerts.filter((a) => a.active)
  const firedAlerts = alerts.filter((a) => !a.active)

  return (
    <div className="space-y-6">
      {activeAlerts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Aktivni ({activeAlerts.length})
          </h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {activeAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} deletingId={deletingId} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {firedAlerts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Okidnuti ({firedAlerts.length})
          </h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden opacity-60">
            {firedAlerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} deletingId={deletingId} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AlertRow({
  alert,
  deletingId,
  onDelete,
}: {
  alert: PriceAlert
  deletingId: number | null
  onDelete: (id: number) => void
}) {
  const isAbove = alert.direction === 'ABOVE'

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${alert.active ? 'bg-blue-50' : 'bg-gray-100'}`}>
          <Bell size={15} className={alert.active ? 'text-blue-500' : 'text-gray-400'} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{alert.ticker}</span>
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
              isAbove ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {isAbove ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isAbove ? 'Iznad' : 'Ispod'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Prag: <span className="font-mono font-medium text-gray-700">${(alert.threshold ?? 0).toFixed(4)}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            {formatDate(alert.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          alert.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {alert.active ? 'Aktivan' : 'Okidnut'}
        </span>
        <button
          onClick={() => onDelete(alert.id)}
          disabled={deletingId === alert.id}
          className="text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
          title="Obriši alarm"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
