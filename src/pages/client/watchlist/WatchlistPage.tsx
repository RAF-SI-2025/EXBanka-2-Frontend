import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Plus, Trash2, ExternalLink, TrendingUp, TrendingDown, Search, Bell, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  listWatchlists,
  createWatchlist,
  deleteWatchlist,
  renameWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from '@/services/watchlistService'
import type { ListingDetail, ListingType, Watchlist, WatchlistDetail, WatchlistItem } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { hartijeDetailPath } from '@/router/helpers'
import PriceAlertModal from '@/components/trading/PriceAlertModal'

const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  STOCK: 'Akcija',
  FOREX: 'Forex',
  FUTURE: 'Future',
  OPTION: 'Opcija',
}

function ListingTypeBadge({ type }: { type: ListingType }) {
  const colors: Record<ListingType, string> = {
    STOCK: 'bg-blue-100 text-blue-700',
    FOREX: 'bg-purple-100 text-purple-700',
    FUTURE: 'bg-orange-100 text-orange-700',
    OPTION: 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {LISTING_TYPE_LABELS[type] ?? type}
    </span>
  )
}

function WatchlistItemRow({
  item,
  onRemove,
  onSetAlert,
}: {
  item: WatchlistItem
  onRemove: () => void
  onSetAlert: () => void
}) {
  const isPositive = item.changePercent >= 0
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={hartijeDetailPath(String(item.listingId))}
          className="flex items-center gap-1.5 font-semibold text-primary-700 hover:underline"
        >
          {item.ticker}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </Link>
        <ListingTypeBadge type={item.listingType} />
        <span className="hidden sm:inline text-sm text-gray-500 truncate">{item.name}</span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="font-mono text-sm font-medium text-gray-900">
          ${item.price.toFixed(4)}
        </span>
        <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
        <button
          onClick={onSetAlert}
          className="text-gray-300 hover:text-blue-500 transition-colors"
          title="Postavi price alert"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors"
          title="Ukloni iz watchliste"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function watchlistItemToListingDetail(item: WatchlistItem): ListingDetail {
  return {
    base: {
      id: String(item.listingId),
      ticker: item.ticker,
      name: item.name,
      listingType: item.listingType,
      exchangeId: '',
      price: item.price,
      ask: item.price,
      bid: item.price,
      volume: '0',
      changePercent: item.changePercent,
      dollarVolume: 0,
      initialMarginCost: 0,
      lastRefresh: '',
    },
    nominalValue: 0,
    contractSize: 0,
    maintenanceMargin: 0,
    detailsJson: '',
  }
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<WatchlistDetail | null>(null)
  const [loadingLists, setLoadingLists] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ListingType | ''>('')
  const [alertItem, setAlertItem] = useState<WatchlistItem | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    listWatchlists()
      .then((lists) => {
        setWatchlists(lists)
        if (lists.length > 0) setSelectedId(lists[0].id)
      })
      .catch(() => toast.error('Greška pri učitavanju watchlisti.'))
      .finally(() => setLoadingLists(false))
  }, [])

  useEffect(() => {
    if (selectedId == null) { setDetail(null); return }
    setLoadingDetail(true)
    getWatchlist(selectedId)
      .then(setDetail)
      .catch(() => toast.error('Greška pri učitavanju watchliste.'))
      .finally(() => setLoadingDetail(false))
  }, [selectedId])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const wl = await createWatchlist(newName.trim())
      setWatchlists((prev) => [wl, ...prev])
      setSelectedId(wl.id)
      setNewName('')
      setShowCreate(false)
      toast.success(`Watchlist "${wl.name}" je kreiran.`)
    } catch {
      toast.error('Greška pri kreiranju watchliste.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteList(id: number) {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu watchlistu?')) return
    try {
      await deleteWatchlist(id)
      const updated = watchlists.filter((w) => w.id !== id)
      setWatchlists(updated)
      if (selectedId === id) setSelectedId(updated[0]?.id ?? null)
      toast.success('Watchlista je obrisana.')
    } catch {
      toast.error('Greška pri brisanju watchliste.')
    }
  }

  async function handleRemoveItem(listingId: number) {
    if (!selectedId) return
    try {
      await removeFromWatchlist(selectedId, listingId)
      setDetail((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.listingId !== listingId) } : prev
      )
    } catch {
      toast.error('Greška pri uklanjanju hartije.')
    }
  }

  function startRename(wl: Watchlist, e: React.MouseEvent) {
    e.stopPropagation()
    setRenamingId(wl.id)
    setRenameValue(wl.name)
  }

  async function handleRenameConfirm(id: number) {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenaming(true)
    try {
      const updated = await renameWatchlist(id, trimmed)
      setWatchlists((prev) => prev.map((w) => w.id === id ? { ...w, name: updated.name } : w))
      if (detail && detail.id === id) setDetail((prev) => prev ? { ...prev, name: updated.name } : prev)
      toast.success(`Watchlista preimenovana u "${updated.name}".`)
    } catch {
      toast.error('Greška pri preimenovanju watchliste.')
    } finally {
      setRenaming(false)
      setRenamingId(null)
    }
  }

  function cancelRename(e?: React.MouseEvent) {
    e?.stopPropagation()
    setRenamingId(null)
    setRenameValue('')
  }

  const visibleItems = (detail?.items ?? []).filter((item) => {
    if (typeFilter && item.listingType !== typeFilter) return false
    if (search && !item.ticker.toLowerCase().includes(search.toLowerCase()) &&
        !item.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loadingLists) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchliste</h1>
          <p className="text-sm text-gray-500 mt-1">Pratite hartije koje vas zanimaju</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova lista
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Naziv watchliste..."
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
            maxLength={100}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 rounded bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Kreiranje...' : 'Kreiraj'}
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName('') }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Otkaži
          </button>
        </div>
      )}

      {watchlists.length === 0 ? (
        <div className="bg-white rounded-xl shadow flex flex-col items-center gap-3 py-16">
          <Bookmark className="h-10 w-10 text-gray-300" />
          <p className="text-gray-500 text-sm">Nemate nijednu watchlistu.</p>
          <p className="text-xs text-gray-400">Kreirajte listu i dodajte hartije sa stranice detalja.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar: list of watchlists */}
          <div className="w-52 flex-shrink-0 space-y-1">
            {watchlists.map((wl) => (
              <div
                key={wl.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors group ${
                  renamingId === wl.id
                    ? 'bg-primary-50'
                    : selectedId === wl.id
                      ? 'bg-primary-50 text-primary-800 cursor-pointer'
                      : 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                }`}
                onClick={() => renamingId !== wl.id && setSelectedId(wl.id)}
              >
                {renamingId === wl.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameConfirm(wl.id)
                        if (e.key === 'Escape') cancelRename()
                      }}
                      className="flex-1 min-w-0 rounded border border-primary-400 px-1.5 py-0.5 text-sm focus:outline-none"
                      maxLength={100}
                      disabled={renaming}
                    />
                    <button
                      onClick={() => handleRenameConfirm(wl.id)}
                      disabled={renaming || !renameValue.trim()}
                      className="text-green-600 hover:text-green-700 disabled:opacity-40"
                      title="Potvrdi"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={cancelRename}
                      disabled={renaming}
                      className="text-gray-400 hover:text-gray-600"
                      title="Otkaži"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className={`h-4 w-4 flex-shrink-0 ${selectedId === wl.id ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium truncate">{wl.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => startRename(wl, e)}
                        className="text-gray-300 hover:text-primary-500"
                        title="Preimenuj listu"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(wl.id) }}
                        className="text-gray-300 hover:text-red-500"
                        title="Obriši listu"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Main: selected watchlist items */}
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow overflow-hidden">
            {loadingDetail ? (
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : detail ? (
              <>
                {/* Filter bar */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
                  <div className="relative flex-1 min-w-0 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pretraži ticker..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(['', 'STOCK', 'FOREX', 'FUTURE', 'OPTION'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={[
                          'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                          typeFilter === t
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        ].join(' ')}
                      >
                        {t === '' ? 'Sve' : LISTING_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {detail.items.length === 0
                      ? 'Lista je prazna. Dodajte hartije sa stranice detalja hartije.'
                      : 'Nema hartija koje odgovaraju filteru.'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {visibleItems.map((item) => (
                      <WatchlistItemRow
                        key={item.listingId}
                        item={item}
                        onRemove={() => handleRemoveItem(item.listingId)}
                        onSetAlert={() => setAlertItem(item)}
                      />
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-400">
                  {visibleItems.length} od {detail.items.length} hartija
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {alertItem && (
        <PriceAlertModal
          open={true}
          listing={watchlistItemToListingDetail(alertItem)}
          onClose={() => setAlertItem(null)}
        />
      )}
    </div>
  )
}
