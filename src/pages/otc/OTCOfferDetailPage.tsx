import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
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
      <button
        onClick={() => navigate('/otc')}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        OTC Ponude i Ugovori
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
          <FileText className="h-5 w-5 text-primary-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Detalji ponude
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            <span className="font-medium text-primary-700">{activeOffer.stock.ticker}</span>
            {activeOffer.stock.exchange && (
              <span className="text-gray-400"> · {activeOffer.stock.exchange}</span>
            )}
            <span className="text-gray-400"> · #{activeOffer.id}</span>
          </p>
        </div>
      </div>

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
