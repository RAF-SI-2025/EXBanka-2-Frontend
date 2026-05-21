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

const RAW_BASE = (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL ?? ''
const API_BASE = RAW_BASE.replace(/\/api\/?$/, '')

export default function OTCTradingPage() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const { setSagaStatus } = useCelina4Store()
  const isEmployee = user?.userType === 'EMPLOYEE' || user?.userType === 'ADMIN'

  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<MarketplaceItem | null>(null)
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<OfferForm>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const loadAccounts = isEmployee ? () => getBankAccounts(true) : getClientAccounts
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
    return () => { alive = false }
  }, [accessToken, isEmployee])

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
          settlementDate: form.settlementDate,
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

  const totalValue =
    form.amount && form.pricePerStock
      ? Number(form.amount) * Number(form.pricePerStock)
      : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-8 py-10 shadow-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300">
                Over-The-Counter · Tržište hartija
              </p>
              <h1 className="text-[2.6rem] font-bold leading-tight tracking-tight text-white">
                OTC Trgovina
              </h1>
              <p className="mt-3 max-w-sm text-[13px] font-light leading-relaxed tracking-wide text-blue-100/80">
                Akcije u javnom OTC režimu — kliknite red da inicirate pregovor sa prodavcem.
              </p>
            </div>
            {!loading && (
              <div className="flex gap-4">
                <StatCard label="Ukupno" value={items.length} />
                <StatCard label="Prikazano" value={filtered.length} highlight />
              </div>
            )}
          </div>

          {/* Search bar inside header */}
          <div className="mt-7">
            <div className="relative max-w-md">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pretraga po tickeru, nazivu, berzi…"
                className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-blue-200 backdrop-blur-sm focus:border-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6">

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                {[
                  { label: 'Ticker', align: 'left' },
                  { label: 'Naziv', align: 'left' },
                  { label: 'Berza', align: 'left' },
                  { label: 'Prodavac', align: 'left' },
                  { label: 'Tržišna cena', align: 'right' },
                  { label: 'Dostupno', align: 'right' },
                  { label: '', align: 'right' },
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Skeleton loading */}
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[80, 160, 70, 110, 90, 60, 70].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div
                        className="h-4 animate-pulse rounded-md bg-gray-100"
                        style={{ width: w }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty state */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                      <svg className="h-8 w-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-500">Trenutno nema akcija u OTC javnom režimu.</p>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="mt-2 text-xs text-blue-600 hover:underline"
                      >
                        Obriši pretragu
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {filtered.map((it) => (
                <tr
                  key={`${it.sellerId}-${it.listingId}`}
                  onClick={() => openOfferModal(it)}
                  className="group cursor-pointer transition-colors hover:bg-blue-50/60"
                >
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                      {it.ticker}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">{it.stockName}</td>
                  <td className="px-5 py-4">
                    {it.exchange
                      ? <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{it.exchange}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {it.sellerName || `#${it.sellerId}`}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-sm font-semibold text-emerald-600">
                      ${it.marketPriceUsd.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono text-sm text-gray-700">
                      {it.availableQuantity.toLocaleString('sr-RS')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openOfferModal(it) }}
                      className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md group-hover:opacity-100 opacity-70"
                    >
                      Ponudi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Offer Modal ─────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-white/20 px-3 py-1 text-base font-extrabold text-white ring-1 ring-white/30">
                      {selected.ticker}
                    </span>
                    {selected.exchange && (
                      <span className="text-xs text-blue-200">{selected.exchange}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-blue-50">{selected.stockName}</p>
                  <p className="mt-0.5 text-xs text-blue-200">
                    Prodavac: {selected.sellerName || `#${selected.sellerId}`}
                    {' · '}
                    <span className="text-amber-300 font-semibold">
                      {selected.availableQuantity} dostupno
                    </span>
                    {' · '}
                    Tržišna cena:{' '}
                    <span className="text-emerald-300 font-semibold">
                      ${selected.marketPriceUsd.toFixed(2)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="mt-0.5 rounded-lg p-1 text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={submitOffer} className="px-6 py-5">
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

              {/* Total value preview */}
              {totalValue !== null && totalValue > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                  <span className="text-xs font-medium text-emerald-700">Ukupna vrednost transakcije</span>
                  <span className="font-mono text-lg font-bold text-emerald-700">
                    ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Račun za isplatu premije *
                </label>
                <select
                  value={form.buyerAccountId}
                  onChange={(e) => setField('buyerAccountId', e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    formErrors.buyerAccountId
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-blue-100'
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
                <p className="mt-1.5 text-xs text-gray-400">
                  Premija se naplaćuje sa ovog računa kada prodavac prihvati ponudu.
                </p>
              </div>

              <div className="mt-5 flex gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-50"
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

// ─── Stat card for hero ───────────────────────────────────────────────────────
function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-6 py-3.5 text-center ${highlight ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10'}`}>
      <div className="text-3xl font-bold tabular-nums text-white"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">{label}</div>
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
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{props.label}</label>
      <input
        type={props.type}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          props.error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-gray-200 focus:border-blue-400 focus:ring-blue-100'
        }`}
      />
      {props.error && <p className="mt-1 text-xs text-red-600">{props.error}</p>}
    </div>
  )
}
