import { useState } from 'react'
import { Bell } from 'lucide-react'
import Dialog from '@/components/common/Dialog'
import { createPriceAlert } from '@/services/priceAlertService'
import type { ListingDetail, PriceAlertDirection } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  listing: ListingDetail
  onCreated?: () => void
}

export default function PriceAlertModal({ open, onClose, listing, onCreated }: Props) {
  const [direction, setDirection] = useState<PriceAlertDirection>('ABOVE')
  const [threshold, setThreshold] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const currentPrice = listing.base.price

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(threshold)
    if (!threshold || isNaN(value) || value <= 0) {
      setError('Unesite ispravan prag cene.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createPriceAlert({
        listingId: Number(listing.base.id),
        threshold: value,
        direction,
      })
      setDone(true)
      onCreated?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju alarma.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setThreshold('')
    setDirection('ABOVE')
    setError(null)
    setDone(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Postavi Price Alert">
      {done ? (
        <div className="py-6 text-center">
          <Bell className="mx-auto mb-3 text-blue-500" size={36} />
          <p className="font-semibold text-gray-800">Alarm je postavljen!</p>
          <p className="mt-1 text-sm text-gray-500">
            Bićete obavešteni emailom kada cena <strong>{listing.base.ticker}</strong>{' '}
            {direction === 'ABOVE' ? 'pređe' : 'padne ispod'} ${threshold}.
          </p>
          <button
            onClick={handleClose}
            className="mt-5 rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Zatvori
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Hartija: <strong>{listing.base.ticker}</strong> — trenutna cena:{' '}
            <strong>${currentPrice.toFixed(4)}</strong>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Uslov</label>
            <div className="flex gap-2">
              {(['ABOVE', 'BELOW'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDirection(dir)}
                  className={`flex-1 rounded border py-2 text-sm font-medium transition-colors ${
                    direction === dir
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {dir === 'ABOVE' ? 'Iznad praga ↑' : 'Ispod praga ↓'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Prag cene ($)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={currentPrice.toFixed(4)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Čuvanje...' : 'Postavi alarm'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
