import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCelina4Store } from '@/store/useCelina4Store'
import { getBankAccounts, getClientAccounts } from '@/services/bankaService'
import type { AccountListItem } from '@/types'
import SAGAStatusToast from '@/components/shared/SAGAStatusToast'

// Portal: OTC Trgovina (Faza 2)
// Lista akcija koje su drugi klijenti stavili u "OTC javni režim" (public_shares),
// umanjeno za količinu već vezanu u aktivnim PENDING ponudama i VALID ugovorima.
// Klikom na akciju otvara se modal za slanje ponude — kupac unosi količinu,
// cenu po akciji, premiju i datum poravnanja, plus svoj račun za isplatu premije.
//
// Backend: GET /api/otc/marketplace, POST /api/otc/offers.

interface MarketplaceItem {
  listingId: number
  ticker: string
  stockName: string
  exchange?: string
  marketPriceUsd: number
  sellerId: number
  sellerName?: string
  availableQuantity: number
}

interface OfferForm {
  amount: string
  pricePerStock: string
  premium: string
  settlementDate: string
  buyerAccountId: string
}

const EMPTY_FORM: OfferForm = {
  amount: '',
  pricePerStock: '',
  premium: '',
  settlementDate: '',
  buyerAccountId: '',
}

// Path-evi u ovoj strani uključuju "/api/" prefiks; ako je VITE_API_BASE_URL
// postavljen na "/api", uklanjamo ga iz baze da ne dobijemo "/api/api/...".
const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? ''
const API_BASE = RAW_BASE.replace(/\/api\/?$/, '')

export default function OTCTradingPage() {
  const navigate = useNavigate()
  const { accessToken, user, hasPermission } = useAuthStore()
  const { setSagaStatus } = useCelina4Store()
  const isSupervisor = user?.userType === 'EMPLOYEE' && hasPermission('SUPERVISOR')

  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<MarketplaceItem | null>(null)
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<OfferForm>>({})
  const [submitting, setSubmitting] = useState(false)

  // ── Inicijalno učitavanje marketplace + računa kupca ──────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const loadAccounts = isSupervisor ? getBankAccounts : getClientAccounts
        const [mpRes, accs] = await Promise.all([
          fetch(`${API_BASE}/api/otc/marketplace`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          }),
          loadAccounts().catch(() => [] as AccountListItem[]),
        ])
        if (!mpRes.ok) throw new Error('Greška pri dohvatu marketplace-a.')
        const data: MarketplaceItem[] = await mpRes.json()
        if (!alive) return
        setItems(Array.isArray(data) ? data : [])
        setAccounts(accs)
      } catch (e: unknown) {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Greška pri učitavanju.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [accessToken, isSupervisor])

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return items
    return items.filter(
      (it) =>
        it.ticker.toUpperCase().includes(q) ||
        it.stockName.toUpperCase().includes(q) ||
        (it.exchange ?? '').toUpperCase().includes(q),
    )
  }, [items, search])

  function openOfferModal(item: MarketplaceItem) {
    setSelected(item)
    setForm({
      ...EMPTY_FORM,
      pricePerStock: item.marketPriceUsd > 0 ? item.marketPriceUsd.toFixed(2) : '',
      buyerAccountId: accounts[0]?.id ?? '',
    })
    setFormErrors({})
  }

  function closeModal() {
    setSelected(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  function setField<K extends keyof OfferForm>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
    setFormErrors((p) => ({ ...p, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<OfferForm> = {}
    const amount = Number(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) errs.amount = 'Unesite pozitivan broj.'
    else if (selected && amount > selected.availableQuantity)
      errs.amount = `Maks. dostupno: ${selected.availableQuantity}.`
    if (!form.pricePerStock || isNaN(Number(form.pricePerStock)) || Number(form.pricePerStock) <= 0)
      errs.pricePerStock = 'Unesite pozitivan broj.'
    if (form.premium === '' || isNaN(Number(form.premium)) || Number(form.premium) < 0)
      errs.premium = 'Unesite nenegativan broj.'
    if (!form.settlementDate) errs.settlementDate = 'Obavezno polje.'
    else if (new Date(form.settlementDate) <= new Date())
      errs.settlementDate = 'Datum mora biti u budućnosti.'
    if (!form.buyerAccountId) errs.buyerAccountId = 'Izaberite račun.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !validate()) return
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
          listingId: selected.listingId,
          sellerId: selected.sellerId,
          buyerAccountId: Number(form.buyerAccountId),
          amount: Number(form.amount),
          pricePerStock: Number(form.pricePerStock),
          premium: Number(form.premium),
          settlementDate: form.settlementDate, // YYYY-MM-DD
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Greška pri slanju ponude.')
      }
      setSagaStatus('success', 'OTC ponuda je uspešno poslata.')
      closeModal()
      setTimeout(() => navigate('/otc'), 1500)
    } catch (e: unknown) {
      setSagaStatus('failure', e instanceof Error ? e.message : 'Greška pri slanju ponude.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OTC Trgovina</h1>
        <p className="mt-1 text-sm text-gray-500">
          Akcije koje su drugi klijenti stavili u OTC javni režim. Klikom na akciju
          inicirate pregovor sa prodavcem.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraga po tickeru, nazivu, berzi…"
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-xs text-gray-500">
          {loading ? 'Učitavanje…' : `${filtered.length} / ${items.length} akcija`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ticker
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Naziv
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Berza
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tržišna cena
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Dostupno
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                {/* akcija */}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Trenutno nema akcija u OTC javnom režimu.
                </td>
              </tr>
            )}
            {filtered.map((it) => (
              <tr
                key={`${it.sellerId}-${it.listingId}`}
                onClick={() => openOfferModal(it)}
                className="cursor-pointer hover:bg-blue-50"
              >
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{it.ticker}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{it.stockName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{it.exchange ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">
                  ${it.marketPriceUsd.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700">
                  {it.availableQuantity}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openOfferModal(it)
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Ponudi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Nova OTC ponuda — {selected.ticker}
              </h2>
              <p className="text-xs text-gray-500">
                {selected.stockName} · prodavac #{selected.sellerId} · dostupno{' '}
                <strong>{selected.availableQuantity}</strong> akcija
              </p>
            </div>

            <form onSubmit={submitOffer} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Količina (kom.) *"
                  type="number"
                  value={form.amount}
                  onChange={(v) => setField('amount', v)}
                  error={formErrors.amount}
                  min={1}
                  max={selected.availableQuantity}
                />
                <Field
                  label="Cena po akciji (USD) *"
                  type="number"
                  step="0.01"
                  value={form.pricePerStock}
                  onChange={(v) => setField('pricePerStock', v)}
                  error={formErrors.pricePerStock}
                  min={0}
                />
                <Field
                  label="Premija (USD) *"
                  type="number"
                  step="0.01"
                  value={form.premium}
                  onChange={(v) => setField('premium', v)}
                  error={formErrors.premium}
                  min={0}
                />
                <Field
                  label="Datum poravnanja *"
                  type="date"
                  value={form.settlementDate}
                  onChange={(v) => setField('settlementDate', v)}
                  error={formErrors.settlementDate}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Račun za isplatu premije *
                </label>
                <select
                  value={form.buyerAccountId}
                  onChange={(e) => setField('buyerAccountId', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    formErrors.buyerAccountId ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">— izaberite račun —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.broj_racuna} · {a.naziv_racuna} —{' '}
                      {a.raspolozivo_stanje.toLocaleString('sr-RS', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {a.valuta_oznaka}
                    </option>
                  ))}
                </select>
                {formErrors.buyerAccountId && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.buyerAccountId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Premija se naplaćuje sa ovog računa kada prodavac prihvati ponudu.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Slanje…' : 'Pošalji ponudu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SAGAStatusToast />
    </div>
  )
}

// ─── Reusable input field ─────────────────────────────────────────────────────
function Field(props: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  error?: string
  min?: number
  max?: number
  step?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{props.label}</label>
      <input
        type={props.type}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
          props.error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        }`}
      />
      {props.error && <p className="mt-1 text-xs text-red-600">{props.error}</p>}
    </div>
  )
}
