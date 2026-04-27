import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

interface NewOfferForm {
  ticker: string
  exchange: string
  amount: string
  pricePerStock: string
  premium: string
  settlementDate: string
  buyerId: string
}

const EMPTY_FORM: NewOfferForm = {
  ticker: '',
  exchange: '',
  amount: '',
  pricePerStock: '',
  premium: '',
  settlementDate: '',
  buyerId: '',
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export default function OTCTradingPage() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const { setSagaStatus } = useCelina4Store()

  const [form, setForm] = useState<NewOfferForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<NewOfferForm>>({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(field: keyof NewOfferForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<NewOfferForm> = {}
    if (!form.ticker.trim()) errs.ticker = 'Obavezno polje.'
    if (!form.exchange.trim()) errs.exchange = 'Obavezno polje.'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Unesite pozitivan broj.'
    if (!form.pricePerStock || isNaN(Number(form.pricePerStock)) || Number(form.pricePerStock) <= 0) errs.pricePerStock = 'Unesite pozitivan broj.'
    if (!form.premium || isNaN(Number(form.premium)) || Number(form.premium) < 0) errs.premium = 'Unesite nenegativan broj.'
    if (!form.settlementDate) errs.settlementDate = 'Obavezno polje.'
    else if (new Date(form.settlementDate) <= new Date()) errs.settlementDate = 'Datum mora biti u budućnosti.'
    if (!form.buyerId.trim()) errs.buyerId = 'Unesite ID kupca.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSagaStatus('pending')
    try {
      const res = await fetch(`${API_BASE}/api/otc/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          stock: {
            ticker: form.ticker.toUpperCase().trim(),
            name: form.ticker.toUpperCase().trim(),
            exchange: form.exchange.trim(),
          },
          amount: Number(form.amount),
          pricePerStock: Number(form.pricePerStock),
          premium: Number(form.premium),
          settlementDate: new Date(form.settlementDate).toISOString(),
          sellerId: user?.id,
          buyerId: form.buyerId.trim(),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Greška pri slanju ponude.')
      }
      setSagaStatus('success', 'OTC ponuda je uspešno poslata.')
      setForm(EMPTY_FORM)
      setTimeout(() => navigate('/otc'), 1500)
    } catch (e: unknown) {
      setSagaStatus('failure', e instanceof Error ? e.message : 'Greška pri slanju ponude.')
    } finally {
      setSubmitting(false)
    }
  }

  const fields: { key: keyof NewOfferForm; label: string; type: string; placeholder?: string; min?: number }[] = [
    { key: 'ticker', label: 'Ticker simbola *', type: 'text', placeholder: 'npr. AAPL' },
    { key: 'exchange', label: 'Berza *', type: 'text', placeholder: 'npr. NASDAQ' },
    { key: 'amount', label: 'Količina (kom.) *', type: 'number', placeholder: '100', min: 1 },
    { key: 'pricePerStock', label: 'Cena po akciji (RSD) *', type: 'number', placeholder: '0.00', min: 0 },
    { key: 'premium', label: 'Premija (RSD) *', type: 'number', placeholder: '0.00', min: 0 },
    { key: 'settlementDate', label: 'Datum poravnanja *', type: 'date' },
    { key: 'buyerId', label: 'ID kupca *', type: 'text', placeholder: 'UUID kupca' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-gray-500">
        <button className="hover:text-gray-700" onClick={() => navigate('/otc')}>
          ← OTC Ponude i Ugovori
        </button>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">OTC Trgovina</h1>
      <p className="mb-6 text-sm text-gray-500">
        Iniciranjem OTC ponude direktno pregovarate sa kupcem van berze.
        Popunite sve podatke o hartiji i uslovima ugovora.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(f => (
            <div key={f.key} className={f.key === 'buyerId' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{f.label}</label>
              <input
                type={f.type}
                min={f.min}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => handleChange(f.key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  errors[f.key] ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              />
              {errors[f.key] && <p className="mt-1 text-xs text-red-600">{errors[f.key]}</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/otc')}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Slanje...' : 'Pošalji OTC ponudu'}
          </button>
        </div>
      </form>

      <SAGAStatusToast />
    </div>
  )
}
