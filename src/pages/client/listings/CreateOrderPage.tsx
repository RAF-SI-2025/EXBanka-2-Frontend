import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react'
import { useListingsStore } from '@/store/useListingsStore'
import { useAuthStore } from '@/store/authStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { hartijeListPath, hartijeDetailPath } from '@/router/helpers'
import { getClientAccounts, createListingOrder } from '@/services/bankaService'
import type { AccountListItem } from '@/types'

type OrderSide = 'BUY' | 'SELL'
type OrderType = 'MARKET' | 'LIMIT' | 'STOP'

export default function CreateOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const isClient = user?.userType === 'CLIENT'
  const isActuary = user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN'

  const { selectedListing, loadingDetail, error, fetchListingById, clearSelected } =
    useListingsStore()

  const [side, setSide] = useState<OrderSide>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [quantity, setQuantity] = useState<string>('1')
  const [limitPrice, setLimitPrice] = useState<string>('')
  const [stopPrice, setStopPrice] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchListingById(id)
    return () => clearSelected()
  }, [id])

  useEffect(() => {
    if (!isClient) {
      setLoadingAccounts(false)
      return
    }
    let cancelled = false
    getClientAccounts()
      .then((acc) => {
        if (cancelled) return
        setAccounts(acc)
        setSelectedAccountId((prev) => (prev ? prev : acc[0]?.id ?? ''))
      })
      .catch(() => {
        if (!cancelled) setAccounts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })
    return () => {
      cancelled = true
    }
  }, [isClient])

  if (user && !isClient && !isActuary) {
    return <Navigate to={hartijeListPath()} replace />
  }

  if (loadingDetail) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !selectedListing) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Hartija nije pronađena.</p>
        <button
          onClick={() => navigate(hartijeListPath())}
          className="mt-4 text-primary-600 hover:underline text-sm"
        >
          Nazad na listu
        </button>
      </div>
    )
  }

  const { base } = selectedListing
  const isPositive = base.changePercent >= 0
  const qty = parseFloat(quantity) || 0
  const execPrice =
    orderType === 'MARKET'
      ? base.ask
      : orderType === 'LIMIT'
        ? parseFloat(limitPrice) || base.price
        : parseFloat(stopPrice) || base.price
  // Market: približna vrednost = Contract Size × Ask × količina
  const estimatedTotal = qty * execPrice * selectedListing.contractSize

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qty <= 0 || !id) return
    setSubmitError(null)
    if (isClient && !selectedAccountId) {
      setSubmitError('Izaberite račun sa kog se skida novac.')
      return
    }
    if (!window.confirm('Potvrđujete kreiranje ovog naloga?')) {
      return
    }
    setSubmitting(true)
    try {
      await createListingOrder({
        accountId: selectedAccountId,
        listingId: id,
        side,
        orderType,
        quantity: qty,
        limitPrice: orderType === 'LIMIT' ? parseFloat(limitPrice) || 0 : 0,
        stopPrice: orderType === 'STOP' ? parseFloat(stopPrice) || 0 : 0,
      })
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nalog nije mogao biti kreiran.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <ShoppingCart className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Nalog je kreiran</h2>
        <p className="text-gray-500 text-sm">
          {side === 'BUY' ? 'Nalog za kupovinu' : 'Nalog za prodaju'} {qty} x{' '}
          <span className="font-semibold">{base.ticker}</span> je uspešno kreiran.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(hartijeListPath())}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Nazad na listu
          </button>
          <button
            onClick={() => {
              setSubmitted(false)
              setSubmitError(null)
              setQuantity('1')
              setLimitPrice('')
              setStopPrice('')
            }}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 transition-colors"
          >
            Novi nalog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Navigacija */}
      <button
        onClick={() => navigate(id ? hartijeDetailPath(id) : hartijeListPath())}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Nazad na detalje
      </button>

      {/* Naslov */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kreiraj nalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          {base.ticker} — {base.name}
        </p>
      </div>

      {/* Kartica sa trenutnom cenom */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Trenutna cena</p>
          <p className="text-2xl font-bold text-gray-900">${base.price.toFixed(4)}</p>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {isPositive ? '+' : ''}
          {base.changePercent.toFixed(2)}%
        </div>
      </div>

      {/* Forma */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* BUY / SELL toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Smer naloga
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                side === 'BUY'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Kupi
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                side === 'SELL'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              Prodaj
            </button>
          </div>
        </div>

        {/* Tip naloga */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Tip naloga
          </label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          >
            <option value="MARKET">Market — po tržišnoj ceni</option>
            <option value="LIMIT">Limit — po zadatoj ceni</option>
            <option value="STOP">Stop — aktivira se na ceni</option>
          </select>
        </div>

        {/* Količina */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Količina {selectedListing.contractSize > 1 && `(veličina kontr.: ${selectedListing.contractSize})`}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* Limit cena (samo za LIMIT) */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Limit cena ($)
            </label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              required
              placeholder={base.price.toFixed(4)}
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        )}

        {/* Stop cena (samo za STOP) */}
        {orderType === 'STOP' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Stop cena ($)
            </label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              required
              placeholder={base.price.toFixed(4)}
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        )}

        {/* Procena iznosa */}
        {qty > 0 && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Procena iznosa</p>
            <p className="text-xl font-bold text-gray-900">
              ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {qty} × ${execPrice.toFixed(4)}
              {selectedListing.contractSize > 1 && ` × ${selectedListing.contractSize}`}
            </p>
          </div>
        )}

        {isClient && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Račun za naplatu
            </label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <LoadingSpinner size="sm" />
                Učitavanje računa…
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Nemate aktivnih računa. Otvorite račun u banci da biste trgovali.
              </p>
            ) : (
              <select
                required
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.broj_racuna} · {a.naziv_racuna} — raspoloživo{' '}
                    {a.raspolozivo_stanje.toLocaleString('sr-RS', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {a.valuta_oznaka}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3"
          >
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={
            submitting ||
            qty <= 0 ||
            (isClient && (loadingAccounts || accounts.length === 0 || !selectedAccountId))
          }
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            side === 'BUY'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Kreiranje...
            </span>
          ) : (
            `${side === 'BUY' ? 'Kupi' : 'Prodaj'} ${qty > 0 ? qty : ''} ${base.ticker}`
          )}
        </button>
      </form>
    </div>
  )
}
