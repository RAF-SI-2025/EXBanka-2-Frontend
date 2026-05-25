import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Plus, Pause, Play, Trash2, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { getClientAccounts, getBankAccounts } from '@/services/bankaService'
import { getListings } from '@/services/listingsService'
import {
  listRecurringOrders,
  createRecurringOrder,
  pauseRecurringOrder,
  resumeRecurringOrder,
  deleteRecurringOrder,
} from '@/services/recurringOrderService'
import type { AccountListItem, Listing, RecurringOrder, RecurringCadence, RecurringMode, TradingDirection } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CADENCE_LABELS: Record<RecurringCadence, string> = {
  DAILY: 'Dnevno',
  WEEKLY: 'Nedeljno',
  MONTHLY: 'Mesečno',
}

const MODE_LABELS: Record<RecurringMode, string> = {
  BYAMOUNT: 'Po iznosu',
  BYQUANTITY: 'Po količini',
}

function DirectionBadge({ d }: { d: TradingDirection }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      d === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {d === 'BUY' ? 'Kupovina' : 'Prodaja'}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
    }`}>
      {active ? 'Aktivan' : 'Pauziran'}
    </span>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreated: (order: RecurringOrder) => void
  isClient: boolean
}

function CreateModal({ onClose, onCreated, isClient }: CreateModalProps) {
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [listingSearch, setListingSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Listing[]>([])
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [direction, setDirection] = useState<TradingDirection>('BUY')
  const [mode, setMode] = useState<RecurringMode>('BYAMOUNT')
  const [value, setValue] = useState('')
  const [accountId, setAccountId] = useState('')
  const [cadence, setCadence] = useState<RecurringCadence>('MONTHLY')
  const [nextRun, setNextRun] = useState('')
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const fetchAccounts = isClient
      ? getClientAccounts()
      : getBankAccounts(true)
    fetchAccounts.then((accs) => {
      setAccounts(accs)
      if (accs.length > 0) setAccountId(accs[0].id)
    }).catch(() => {})
  }, [isClient])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!listingSearch.trim()) { setSearchResults([]); setShowDropdown(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getListings({ search: listingSearch.trim(), pageSize: 8 })
        setSearchResults(res.listings)
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      }
    }, 300)
  }, [listingSearch])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedListing) { toast.error('Izaberite hartiju'); return }
    if (!accountId) { toast.error('Izaberite račun'); return }
    if (!nextRun) { toast.error('Unesite vreme prvog izvršenja'); return }
    const v = parseFloat(value)
    if (!v || v <= 0) { toast.error('Unesite ispravnu vrednost'); return }

    setSaving(true)
    try {
      const order = await createRecurringOrder({
        listingId: Number(selectedListing.id),
        direction,
        mode,
        value: v,
        accountId: Number(accountId),
        isClient,
        cadence,
        nextRun: new Date(nextRun).toISOString(),
      })
      toast.success('Trajni nalog kreiran')
      onCreated(order)
    } catch {
      toast.error('Greška pri kreiranju trajnog naloga')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Novi trajni nalog</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Listing search */}
          <div ref={searchRef}>
            <label className={labelCls}>Hartija</label>
            {selectedListing ? (
              <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                <span className="text-sm font-medium text-primary-800">
                  {selectedListing.ticker} — {selectedListing.name}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedListing(null); setListingSearch('') }}
                  className="ml-2 text-primary-400 hover:text-primary-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pretraži po tikeru ili imenu..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { setSelectedListing(l); setShowDropdown(false); setListingSearch('') }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                      >
                        <span className="font-medium text-gray-900">{l.ticker}</span>
                        <span className="text-gray-500 truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direction + Mode row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Smer</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value as TradingDirection)} className={inputCls}>
                <option value="BUY">Kupovina</option>
                <option value="SELL">Prodaja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Mod</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as RecurringMode)} className={inputCls}>
                <option value="BYAMOUNT">Po iznosu</option>
                <option value="BYQUANTITY">Po količini</option>
              </select>
            </div>
          </div>

          {/* Value */}
          <div>
            <label className={labelCls}>
              {mode === 'BYAMOUNT' ? 'Iznos (valuta računa)' : 'Količina (komada)'}
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder={mode === 'BYAMOUNT' ? 'npr. 5000' : 'npr. 10'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Account */}
          <div>
            <label className={labelCls}>Račun</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls} required>
              <option value="">Izaberite račun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.naziv_racuna || a.broj_racuna} ({a.valuta_oznaka}) — {a.raspolozivo_stanje.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Cadence + Next Run */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Interval</label>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as RecurringCadence)} className={inputCls}>
                <option value="DAILY">Dnevno</option>
                <option value="WEEKLY">Nedeljno</option>
                <option value="MONTHLY">Mesečno</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Prvo izvršenje</label>
              <input
                type="datetime-local"
                value={nextRun}
                onChange={(e) => setNextRun(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Kreiranje...' : 'Kreiraj nalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecurringOrdersPage() {
  const { user } = useAuthStore()
  const isClient = user?.userType === 'CLIENT'

  const [orders, setOrders] = useState<RecurringOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    setLoading(true)
    listRecurringOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  async function handlePauseResume(order: RecurringOrder) {
    try {
      const updated = order.active
        ? await pauseRecurringOrder(order.id)
        : await resumeRecurringOrder(order.id)
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)))
      toast.success(order.active ? 'Nalog pauziran' : 'Nalog aktiviran')
    } catch {
      toast.error('Greška')
    }
  }

  async function handleDelete(order: RecurringOrder) {
    if (!confirm(`Otkazati trajni nalog za ${order.ticker}?`)) return
    try {
      await deleteRecurringOrder(order.id)
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      toast.success('Nalog otkazan')
    } catch {
      toast.error('Greška pri otkazivanju')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trajni nalozi</h1>
            <p className="text-sm text-gray-500 mt-0.5">Dollar-cost averaging — automatski Market Order po rasporedu</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novi trajni nalog
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nemate trajnih naloga.</p>
            <p className="text-xs text-gray-400 mt-1">Kreirajte nalog za automatsku kupovinu ili prodaju u zadatim intervalima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Hartija', 'Smer', 'Mod', 'Vrednost', 'Interval', 'Sledeće izvršenje', 'Status', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.ticker || `#${o.listingId}`}</td>
                    <td className="px-4 py-3"><DirectionBadge d={o.direction} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{MODE_LABELS[o.mode]}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-800">
                      {o.mode === 'BYAMOUNT' ? `${o.value.toFixed(2)} RSD` : `${o.value} kom`}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{CADENCE_LABELS[o.cadence]}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {new Date(o.nextRun).toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={o.active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePauseResume(o)}
                          title={o.active ? 'Pauziraj' : 'Aktiviraj'}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          {o.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          title="Otkaži trajni nalog"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          isClient={isClient}
          onClose={() => setShowCreate(false)}
          onCreated={(order) => {
            setOrders((prev) => [order, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}
