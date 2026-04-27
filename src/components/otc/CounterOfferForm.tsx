import { useState } from 'react'
import type { OTCOffer } from '@/types/celina4'

interface CounterOfferData {
  amount: number
  pricePerStock: number
  premium: number
  settlementDate: string
}

interface CounterOfferFormProps {
  offer: OTCOffer
  onSubmit: (data: CounterOfferData) => void
  onAccept: () => void
  onReject: () => void
  isLoading?: boolean
}

export default function CounterOfferForm({ offer, onSubmit, onAccept, onReject, isLoading }: CounterOfferFormProps) {
  const [form, setForm] = useState<CounterOfferData>({
    amount: offer.amount,
    pricePerStock: offer.pricePerStock,
    premium: offer.premium,
    settlementDate: offer.settlementDate.slice(0, 10),
  })

  function handleChange(field: keyof CounterOfferData, value: string) {
    setForm(prev => ({
      ...prev,
      [field]: field === 'settlementDate' ? value : parseFloat(value) || 0,
    }))
  }

  const fields: { key: keyof CounterOfferData; label: string; type: string; min?: number }[] = [
    { key: 'amount', label: 'Količina', type: 'number', min: 1 },
    { key: 'pricePerStock', label: 'Cena po akciji (RSD)', type: 'number', min: 0 },
    { key: 'premium', label: 'Premija (RSD)', type: 'number', min: 0 },
    { key: 'settlementDate', label: 'Datum poravnanja', type: 'date' },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {offer.stock.ticker} — {offer.stock.name}
        </h2>
        <p className="text-sm text-gray-500">{offer.stock.exchange}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(f => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{f.label}</label>
            <input
              type={f.type}
              min={f.min}
              value={form[f.key]}
              onChange={e => handleChange(f.key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Prihvati
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Odbij
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Pošalji kontraponudu
        </button>
      </div>
    </div>
  )
}
