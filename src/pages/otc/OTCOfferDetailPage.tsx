import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import CounterOfferForm from '@/components/otc/CounterOfferForm'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

export default function OTCOfferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    activeOffer,
    activeOfferLoading,
    sagaStatus,
    fetchOfferDetail,
    markOfferRead,
    counterOffer,
    acceptOffer,
    rejectOffer,
  } = useCelina4Store()

  useEffect(() => {
    if (!id) return
    fetchOfferDetail(id)
    markOfferRead(id)
  }, [id, fetchOfferDetail, markOfferRead])

  if (activeOfferLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!activeOffer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        Ponuda nije pronađena.
      </div>
    )
  }

  const isLoading = sagaStatus === 'pending'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-gray-500">
        <button
          className="hover:text-gray-700"
          onClick={() => navigate('/otc/offers')}
        >
          ← OTC Ponude
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Ponuda #{activeOffer.id}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Detalji ponude — {activeOffer.stock.ticker}
      </h1>

      <CounterOfferForm
        offer={activeOffer}
        isLoading={isLoading}
        onSubmit={data => id && counterOffer(id, data)}
        onAccept={(sellerAccountId) => id && acceptOffer(id, sellerAccountId)}
        onReject={() => id && rejectOffer(id)}
      />

      <SAGAStatusToast />
    </div>
  )
}
