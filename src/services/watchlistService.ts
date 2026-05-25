import { apiDelete, apiGet, apiPost } from './grpcClient'
import type { Watchlist, WatchlistDetail } from '@/types'

export async function listWatchlists(): Promise<Watchlist[]> {
  const res = await apiGet<{ watchlists: Watchlist[] | null }>('/bank/watchlists')
  return res.watchlists ?? []
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const res = await apiPost<{ name: string }, { watchlist: Watchlist }>('/bank/watchlists', { name })
  return res.watchlist
}

export async function deleteWatchlist(id: number): Promise<void> {
  await apiDelete(`/bank/watchlists/${id}`)
}

export async function getWatchlist(id: number): Promise<WatchlistDetail> {
  const res = await apiGet<{ watchlist: WatchlistDetail }>(`/bank/watchlists/${id}`)
  return res.watchlist
}

export async function addToWatchlist(watchlistId: number, listingId: number): Promise<void> {
  await apiPost(`/bank/watchlists/${watchlistId}/items`, { listingId })
}

export async function removeFromWatchlist(watchlistId: number, listingId: number): Promise<void> {
  await apiDelete(`/bank/watchlists/${watchlistId}/items/${listingId}`)
}
