import { useAuthStore } from '@/store/authStore'
import type { OTCOffer } from '@/types/celina4'
import PriceDeviationBadge from '@/components/shared/PriceDeviationBadge'

interface OTCTradeTableProps {
  offers: OTCOffer[]
  onView: (id: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_LABELS: Record<OTCOffer['status'], string> = {
  ACTIVE: 'Aktivna',
  ACCEPTED: 'Prihvaćena',
  REJECTED: 'Odbijena',
  EXPIRED: 'Istekla',
}

export default function OTCTradeTable({ offers, onView }: OTCTradeTableProps) {
  const { user } = useAuthStore()

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Akcija', 'Količina', 'Cena', 'Premija', 'Poravnanje', 'Izmenio', 'Poslednja izmena', 'Status', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {offers.length === 0 && (
            <tr>
              <td colSpan={9} className="py-10 text-center text-gray-400">
                Nema ponuda.
              </td>
            </tr>
          )}
          {offers.map(offer => {
            const awaitingMyResponse = offer.modifiedBy !== user?.id && offer.status === 'ACTIVE'
            return (
              <tr
                key={offer.id}
                className={awaitingMyResponse ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {offer.stock.ticker}
                  <span className="ml-1 text-xs text-gray-500">({offer.stock.exchange})</span>
                </td>
                <td className="px-4 py-3 text-gray-700">{offer.amount.toLocaleString('sr-RS')}</td>
                <td className="px-4 py-3">
                  <PriceDeviationBadge
                    currentPrice={offer.pricePerStock}
                    referencePrice={offer.stock.lastKnownMarketPrice ?? offer.pricePerStock}
                  />
                </td>
                <td className="px-4 py-3 text-gray-700">{offer.premium.toLocaleString('sr-RS')}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(offer.settlementDate)}</td>
                <td className="px-4 py-3 text-gray-700">{offer.modifiedBy}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(offer.lastModified)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {STATUS_LABELS[offer.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onView(offer.id)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Pregledaj
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
