import { apiGet } from './grpcClient'
import type { Listing, ListingDetail, ListingHistoryItem, ListingsFilter } from '@/types'

interface GetListingsResponse {
  listings: Listing[]
  total: number
}

interface GetListingHistoryResponse {
  history: ListingHistoryItem[]
}

export async function getListings(
  params?: ListingsFilter
): Promise<GetListingsResponse> {
  return apiGet<GetListingsResponse>(
    '/bank/listings',
    params as Record<string, string | number | boolean | undefined>
  )
}

export async function getListingById(id: string): Promise<ListingDetail> {
  return apiGet<ListingDetail>(`/bank/listings/${id}`)
}

export async function getListingHistory(
  id: string,
  fromDate?: string,
  toDate?: string
): Promise<ListingHistoryItem[]> {
  const res = await apiGet<GetListingHistoryResponse>(
    `/bank/listings/${id}/history`,
    {
      from_date: fromDate,
      to_date: toDate,
    } as Record<string, string | undefined>
  )
  return res.history ?? []
}
