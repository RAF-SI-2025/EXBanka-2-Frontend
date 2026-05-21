import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
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
  EXPIRED: 'Povučena/istekla',
}

const STATUS_STYLES: Record<OTCOffer['status'], string> = {
  ACTIVE: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  REJECTED: 'bg-red-50 text-red-600 ring-1 ring-red-100',
  EXPIRED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

export default function OTCTradeTable({ offers, onView }: OTCTradeTableProps) {
  const { user } = useAuthStore()
  const { acceptOffer, rejectOffer } = useCelina4Store()
  const callerID = String(user?.id ?? '')

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500">Nema ponuda.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {['#', 'Akcija', 'Kupac', 'Prodavac', 'Količina', 'Cena', 'Premija', 'Poravnanje', 'Izmenio', 'Poslednja izmena', 'Status', 'Akcije'].map(h => (
              <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {offers.map(offer => {
            const isBuyer = offer.buyerId === callerID
            const isMyTurn = !!offer.needsReview && offer.status === 'ACTIVE'
            const canQuickAccept = isMyTurn && isBuyer && !!offer.sellerAccountId
            return (
              <tr
                key={offer.id}
                className={`transition-colors ${isMyTurn ? 'bg-amber-50 hover:bg-amber-100/70' : 'hover:bg-blue-50/40'}`}
              >
                <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums">
                  #{offer.id}
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                    {offer.stock.ticker}
                  </span>
                  {offer.stock.exchange && (
                    <span className="ml-1.5 text-xs text-gray-400">({offer.stock.exchange})</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600">
                  {offer.buyerName || `#${offer.buyerId}`}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600">
                  {offer.sellerName || `#${offer.sellerId}`}
                </td>
                <td className="px-5 py-3.5 font-mono text-gray-700">
                  {offer.amount.toLocaleString('sr-RS')}
                </td>
                <td className="px-5 py-3.5">
                  <PriceDeviationBadge
                    currentPrice={offer.pricePerStock}
                    referencePrice={offer.stock.lastKnownMarketPrice ?? offer.pricePerStock}
                    currency="USD"
                  />
                </td>
                <td className="px-5 py-3.5 font-mono text-gray-700">
                  {offer.premium.toLocaleString('sr-RS', { maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3.5 text-gray-600">{formatDate(offer.settlementDate)}</td>
                <td className="px-5 py-3.5 text-xs text-gray-600">
                  {offer.modifiedBy === offer.buyerId
                    ? (offer.buyerName || `#${offer.buyerId}`)
                    : (offer.sellerName || `#${offer.sellerId}`)
                  }
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(offer.lastModified)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[offer.status]}`}>
                    {STATUS_LABELS[offer.status]}
                    {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => onView(offer.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                    >
                      Detalji
                    </button>
                    {canQuickAccept && (
                      <button
                        onClick={() => acceptOffer(offer.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        Prihvati
                      </button>
                    )}
                    {offer.status === 'ACTIVE' && (
                      <button
                        onClick={() => rejectOffer(offer.id)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-100"
                        title={isMyTurn ? 'Odbij' : 'Povuci sopstvenu ponudu'}
                      >
                        {isMyTurn ? 'Odbij' : 'Povuci'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
