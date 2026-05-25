import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Plus } from 'lucide-react'
import { listWatchlists, addToWatchlist, createWatchlist } from '@/services/watchlistService'
import type { Watchlist } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  listingId: number
}

export default function AddToWatchlistButton({ listingId }: Props) {
  const [open, setOpen] = useState(false)
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [added, setAdded] = useState<Set<number>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setLoading(true)
    setOpen(true)
    try {
      const lists = await listWatchlists()
      setWatchlists(lists)
    } catch {
      toast.error('Greška pri učitavanju watchlisti.')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(watchlistId: number) {
    setAdding(watchlistId)
    try {
      await addToWatchlist(watchlistId, listingId)
      setAdded((prev) => new Set([...prev, watchlistId]))
      toast.success('Hartija je dodata u watchlistu.')
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes('već postoji')
        ? 'Hartija već postoji u ovoj watchlisti.'
        : 'Greška pri dodavanju.'
      toast.error(msg)
    } finally {
      setAdding(null)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const wl = await createWatchlist(newName.trim())
      await addToWatchlist(wl.id, listingId)
      setWatchlists((prev) => [wl, ...prev])
      setAdded((prev) => new Set([...prev, wl.id]))
      setNewName('')
      setShowNew(false)
      toast.success(`Dodata u novu watchlistu "${wl.name}".`)
    } catch {
      toast.error('Greška pri kreiranju watchliste.')
    } finally {
      setCreating(false)
    }
  }

  const anyAdded = added.size > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          anyAdded
            ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
        title="Dodaj u watchlistu"
      >
        {anyAdded ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        Watchlist
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-60 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Dodaj u watchlistu
          </div>

          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400">Učitavanje...</div>
          ) : watchlists.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">Nemate watchlisti.</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {watchlists.map((wl) => {
                const isAdded = added.has(wl.id)
                return (
                  <button
                    key={wl.id}
                    onClick={() => !isAdded && handleAdd(wl.id)}
                    disabled={adding === wl.id || isAdded}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                      isAdded
                        ? 'text-primary-700 bg-primary-50 cursor-default'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{wl.name}</span>
                    {isAdded && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
                    {adding === wl.id && <span className="text-xs text-gray-400">...</span>}
                  </button>
                )
              })}
            </div>
          )}

          <div className="border-t border-gray-100 p-2">
            {showNew ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Naziv..."
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                  maxLength={100}
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {creating ? '...' : 'OK'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova watchlista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
