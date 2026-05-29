import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Plus, X } from 'lucide-react'
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
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          anyAdded
            ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title="Dodaj u watchlistu"
      >
        {anyAdded ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        Watchlist
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-semibold text-gray-800">Dodaj u watchlistu</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">Učitavanje...</div>
          ) : watchlists.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Bookmark className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">Nemate watchlisti</p>
              <p className="text-xs text-gray-400 mt-1">Kreirajte prvu listu ispod</p>
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {watchlists.map((wl) => {
                const isAdded = added.has(wl.id)
                const isLoading = adding === wl.id
                return (
                  <button
                    key={wl.id}
                    onClick={() => !isAdded && !isLoading && handleAdd(wl.id)}
                    disabled={isLoading || isAdded}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isAdded
                        ? 'bg-primary-50 text-primary-700 cursor-default'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isAdded ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      {isAdded
                        ? <Check className="h-3.5 w-3.5 text-primary-600" />
                        : isLoading
                          ? <span className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-primary-500 animate-spin" />
                          : <Bookmark className="h-3.5 w-3.5 text-gray-400" />
                      }
                    </div>
                    <span className="truncate font-medium">{wl.name}</span>
                    {isAdded && (
                      <span className="ml-auto text-xs text-primary-500 flex-shrink-0">Dodato</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer: create new */}
          <div className="border-t border-gray-100 p-3">
            {showNew ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setShowNew(false); setNewName('') }
                  }}
                  placeholder="Naziv liste..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
                  maxLength={100}
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? '...' : 'Kreiraj'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova watchlista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
