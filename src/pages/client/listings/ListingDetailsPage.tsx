import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useListingsStore } from '@/store/useListingsStore'
import { useAuthStore } from '@/store/authStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import OptionsMatrix from './OptionsMatrix'
import { hartijeListPath, hartijeKupovinaPath } from '@/router/helpers'

const PERIOD_BUTTONS: { label: string; days: number }[] = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 1825 },
]

function formatMoney(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  return `$${n.toFixed(2)}`
}

export default function ListingDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isActuary = user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN'
  const showOptionsMatrix = isActuary
  const [activePeriod, setActivePeriod] = useState(30)

  const {
    selectedListing,
    priceHistory,
    loadingDetail,
    loadingHistory,
    error,
    fetchListingById,
    fetchListingHistory,
    clearSelected,
  } = useListingsStore()

  useEffect(() => {
    if (id) {
      fetchListingById(id)
    }
    return () => clearSelected()
  }, [id])

  useEffect(() => {
    if (!id) return
    const toDate = new Date().toISOString().split('T')[0]
    const fromDate = new Date(Date.now() - activePeriod * 86_400_000)
      .toISOString()
      .split('T')[0]
    fetchListingHistory(id, fromDate, toDate)
  }, [id, activePeriod])

  if (loadingDetail) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  if (!selectedListing) return null

  const { base } = selectedListing
  const isPositive = base.changePercent >= 0

  return (
    <div className="space-y-6">
      {/* Navigacija nazad */}
      <button
        onClick={() => navigate(hartijeListPath())}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Nazad na listu
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">{base.ticker}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary-100 text-primary-700 uppercase">
                {base.listingType}
              </span>
            </div>
            <p className="mt-1 text-gray-500">{base.name}</p>
          </div>

          <div className="text-right flex flex-col items-end gap-2">
            <p className="text-3xl font-bold text-gray-900">${base.price.toFixed(4)}</p>
            <div
              className={`flex items-center justify-end gap-1 mt-1 ${
                isPositive ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}
                {base.changePercent.toFixed(2)}%
              </span>
            </div>
            {base.lastRefresh && (
              <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  Poslednje ažuriranje:{' '}
                  {new Date(base.lastRefresh).toLocaleString('sr-RS', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {id && (
              <button
                type="button"
                onClick={() => navigate(hartijeKupovinaPath(id))}
                className="mt-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Kupi
              </button>
            )}
          </div>
        </div>

        {/* Statistike */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Bid</p>
            <p className="text-base font-semibold text-gray-800">${base.bid.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Ask</p>
            <p className="text-base font-semibold text-gray-800">${base.ask.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Dollar Volume</p>
            <p className="text-base font-semibold text-gray-800">
              {formatMoney(base.dollarVolume)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Nominal Value</p>
            <p className="text-base font-semibold text-gray-800">
              {formatMoney(selectedListing.nominalValue)}
            </p>
          </div>
        </div>

        {/* Detalji margine */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Contract Size</p>
            <p className="text-base font-semibold text-gray-800">
              {selectedListing.contractSize.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Maintenance Margin</p>
            <p className="text-base font-semibold text-gray-800">
              ${selectedListing.maintenanceMargin.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Initial Margin Cost</p>
            <p className="text-base font-semibold text-gray-800">
              ${base.initialMarginCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Graf istorije cena */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Istorija cene</h2>
          <div className="flex gap-1">
            {PERIOD_BUTTONS.map(({ label, days }) => (
              <button
                key={label}
                onClick={() => setActivePeriod(days)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activePeriod === days
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : priceHistory.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            Nema istorijskih podataka za izabrani period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cena']}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{
                  fontSize: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Matrica opcija — samo aktuari (zaposleni), samo akcije */}
      {base.listingType === 'STOCK' && showOptionsMatrix && (
        <OptionsMatrix listing={selectedListing} />
      )}
    </div>
  )
}
