import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCelina4Store } from '@/store/useCelina4Store'
import { useAuthStore } from '@/store/authStore'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

const fmtUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function OTCContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeContract, sagaStatus, fetchContractDetail, executeContract } = useCelina4Store()
  const { user } = useAuthStore()

  useEffect(() => {
    if (id) fetchContractDetail(id)
  }, [id, fetchContractDetail])

  if (!activeContract) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }
  const c = activeContract
  const isBuyer = String(user?.id ?? '') === c.buyerId
  const status = (c.status === 'VALID' && new Date(c.settlementDate) < new Date()) ? 'EXPIRED' : c.status
  const currentPrice = c.stock.lastKnownMarketPrice ?? c.strikePrice
  const profit = (c.amount * currentPrice) - (c.amount * c.strikePrice) - c.premium

  const STATUS_MAP: Record<string, string> = {
    VALID: 'Važeći',
    EXPIRED: 'Istekao',
    EXERCISED: 'Iskorišćen',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-gray-500">
        <button className="hover:text-gray-700" onClick={() => navigate('/otc')}>
          ← OTC Ugovori
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Ugovor #{c.id}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {c.stock.ticker} — {c.stock.name}
        </h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
          status === 'VALID' ? 'bg-green-100 text-green-800' :
          status === 'EXPIRED' ? 'bg-gray-100 text-gray-700' :
          'bg-blue-100 text-blue-800'
        }`}>
          {STATUS_MAP[status]}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5">
          {[
            ['Berza', c.stock.exchange],
            ['Količina', c.amount.toLocaleString('sr-RS')],
            ['Strike cena', fmtUSD(c.strikePrice)],
            ['Premija', fmtUSD(c.premium)],
            ['Datum poravnanja', formatDate(c.settlementDate)],
            ['Tržišna cena', c.stock.lastKnownMarketPrice ? fmtUSD(c.stock.lastKnownMarketPrice) : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Prodavac</p>
            <p className="mt-1 font-medium text-gray-900">{c.sellerInfo.name}</p>
            <p className="text-sm text-gray-500">{c.sellerInfo.bankName}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kupac</p>
            <p className="mt-1 font-medium text-gray-900">{c.buyerInfo.name}</p>
            <p className="text-sm text-gray-500">{c.buyerInfo.bankName}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Procenjeni profit</p>
          <p className={`mt-1 text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtUSD(profit)}
          </p>
        </div>

        {isBuyer && (
          <button
            onClick={() => id && executeContract(id)}
            disabled={status !== 'VALID' || sagaStatus === 'pending'}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            title={status !== 'VALID' ? 'Ugovor nije važeći ili je datum poravnanja prošao' : undefined}
          >
            Iskoristi ugovor
          </button>
        )}
      </div>

      <SAGAStatusToast />
    </div>
  )
}
